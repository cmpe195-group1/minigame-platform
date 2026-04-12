/**
 * server.js - Simple WebSocket + HTTP server for Battleship multiplayer
 *
 * This server does TWO things:
 * 1. Serves the static frontend files (dist/ folder)
 * 2. Runs a WebSocket server for real-time multiplayer communication
 *
 * Supports both 2-player and 4-player rooms.
 *
 * DEPLOYMENT:
 *   npm run build      (builds the frontend)
 *   node server.js     (starts the server)
 *
 * The server listens on PORT (env variable) or 3000.
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Serve static files from dist/ (Vite build output)
// ============================================================

app.use(express.static(path.join(__dirname, "dist")));

app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ============================================================
// Create HTTP server and WebSocket server
// ============================================================

const server = createServer(app);
const wss = new WebSocketServer({ server });

/**
 * Room management
 * Each room has a roomId and up to 2 or 4 players (WebSocket connections)
 *
 * 2P rooms: { maxPlayers: 2, players: [host, guest] }
 * 4P rooms: { maxPlayers: 4, players: [p1, p2, p3, p4] }
 */
const rooms = new Map();
// rooms: Map<string, { maxPlayers: number, players: (WebSocket | null)[] }>

/**
 * Handle WebSocket connections
 */
wss.on("connection", (ws) => {
  let currentRoom = null;
  let currentPlayerIndex = null; // 0-based index in the room

  console.log("[WS] New connection");

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // ---- CREATE ROOM (host) ----
      if (msg.type === "create_room") {
        const roomId = msg.roomId;
        const maxPlayers = msg.maxPlayers || 2;
        const players = new Array(maxPlayers).fill(null);
        players[0] = ws;
        rooms.set(roomId, { maxPlayers, players });
        currentRoom = roomId;
        currentPlayerIndex = 0;
        console.log(`[WS] Room created: ${roomId} (max ${maxPlayers} players)`);
        ws.send(JSON.stringify({ type: "room_created", roomId }));
        return;
      }

      // ---- JOIN ROOM (guest / player 2-4) ----
      if (msg.type === "join") {
        const roomId = msg.roomId;
        const room = rooms.get(roomId);

        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
          return;
        }

        // Find first empty slot
        const emptySlot = room.players.findIndex((p) => p === null);
        if (emptySlot === -1) {
          ws.send(JSON.stringify({ type: "error", message: "Room is full" }));
          return;
        }

        room.players[emptySlot] = ws;
        currentRoom = roomId;
        currentPlayerIndex = emptySlot;
        console.log(`[WS] Player ${emptySlot + 1} joined room: ${roomId}`);

        if (room.maxPlayers === 2) {
          // 2P mode: forward to host (backward compatible)
          const host = room.players[0];
          if (host && host.readyState === 1) {
            host.send(JSON.stringify(msg));
          }
        } else {
          // 4P mode: notify ALL other players that someone joined
          const currentCount = room.players.filter((p) => p !== null).length;
          const joinMsg = JSON.stringify({
            type: "player_joined",
            roomId,
            playerIndex: emptySlot,
            currentCount,
          });
          room.players.forEach((p, i) => {
            if (p && p.readyState === 1 && i !== emptySlot) {
              p.send(joinMsg);
            }
          });
          // Also tell the joining player their index and current count
          ws.send(JSON.stringify({
            type: "player_joined",
            roomId,
            playerIndex: emptySlot,
            currentCount,
          }));
        }
        return;
      }

      // ---- RELAY: Forward messages to other player(s) in the room ----
      if (msg.roomId && currentRoom) {
        const room = rooms.get(currentRoom);
        if (!room) return;

        if (room.maxPlayers === 2) {
          // 2P: send to the other player
          const targetIndex = currentPlayerIndex === 0 ? 1 : 0;
          const target = room.players[targetIndex];
          if (target && target.readyState === 1) {
            target.send(JSON.stringify(msg));
          }
        } else {
          // 4P: broadcast to ALL other players
          room.players.forEach((p, i) => {
            if (p && p.readyState === 1 && i !== currentPlayerIndex) {
              p.send(JSON.stringify(msg));
            }
          });
        }
      }
    } catch (err) {
      console.error("[WS] Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Connection closed (room: ${currentRoom}, player: ${currentPlayerIndex})`);

    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        // Notify other players
        if (room.maxPlayers === 2) {
          const otherIndex = currentPlayerIndex === 0 ? 1 : 0;
          const other = room.players[otherIndex];
          if (other && other.readyState === 1) {
            other.send(JSON.stringify({
              type: "opponent_left",
              roomId: currentRoom,
            }));
          }
        } else {
          // 4P: notify all others
          const leftMsg = JSON.stringify({
            type: "player_left_4p",
            roomId: currentRoom,
            playerIndex: currentPlayerIndex,
          });
          room.players.forEach((p, i) => {
            if (p && p.readyState === 1 && i !== currentPlayerIndex) {
              p.send(leftMsg);
            }
          });
        }

        // Clean up the slot
        room.players[currentPlayerIndex] = null;

        // Delete room if all players left
        const anyoneAlive = room.players.some((p) => p !== null);
        if (!anyoneAlive) {
          rooms.delete(currentRoom);
          console.log(`[WS] Room deleted: ${currentRoom}`);
        }
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[WS] WebSocket error:", err);
  });
});

// ============================================================
// Start the server
// ============================================================

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║         ⚓ BATTLESHIP SERVER RUNNING ⚓          ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║   Local:   http://localhost:${String(PORT).padEnd(24)}║
║                                                  ║
║   The game is ready! Open the URL above.         ║
║   Supports 2-player and 4-player rooms.          ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});

// ============================================================
// Cleanup stale rooms every 5 minutes
// ============================================================

setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    const anyAlive = room.players.some((p) => p && p.readyState === 1);
    if (!anyAlive) {
      rooms.delete(roomId);
      console.log(`[Cleanup] Removed stale room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000);
