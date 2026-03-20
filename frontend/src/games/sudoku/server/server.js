/**
 * Sudoku Multiplayer — WebSocket Server
 * Express + Socket.IO
 *
 * Dev  : runs on port 3001, Vite proxies /socket.io → here
 * Prod : serves built dist/ AND WebSocket on the same port
 *        Override with:  PORT=8080 node server.js
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // Must match client order: polling first, then upgrade to websocket.
  // Render (and most reverse-proxy hosts) require the HTTP polling handshake
  // before a WebSocket upgrade is accepted.
  transports: ["polling", "websocket"],
  // Allow extra time for cold-start on free-tier hosts like Render
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
});

// ── In-memory rooms ───────────────────────────────────────────────────────────
const rooms = new Map();

const COLORS = [
  { color: "#3B82F6", colorName: "Blue" },
  { color: "#22C55E", colorName: "Green" },
  { color: "#F97316", colorName: "Orange" },
  { color: "#A855F7", colorName: "Purple" },
];

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function pushRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  io.to(roomCode).emit("ROOM_STATE", room);
}

// ── Socket events ─────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] connected: ${socket.id}`);

  // CREATE_ROOM
  socket.on("CREATE_ROOM", ({ hostName, maxPlayers }) => {
    let code;
    do { code = genCode(); } while (rooms.has(code));

    const room = {
      roomCode: code,
      hostClientId: socket.id,
      maxPlayers: Math.min(Math.max(2, maxPlayers), 4),
      transport: "websocket",
      participants: [
        {
          playerId: 1,
          name: hostName || "Player 1",
          color: COLORS[0].color,
          colorName: COLORS[0].colorName,
          clientId: socket.id,
        },
      ],
      status: "waiting",
      board: null,
      players: [],
      currentPlayerIndex: 0,
      phase: "setup",
      winner: null,
      lastMoveCorrect: null,
      moveCount: 0,
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;

    console.log(`[ROOM] created ${code} by ${hostName}`);
    pushRoom(code);
  });

  // JOIN_ROOM
  socket.on("JOIN_ROOM", ({ roomCode, playerName }, ack) => {
    const code = (roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      ack?.({ error: "Room not found. Check the code and try again." });
      return;
    }
    if (room.status !== "waiting") {
      ack?.({ error: "Game already started. Cannot join now." });
      return;
    }
    if (room.participants.length >= room.maxPlayers) {
      ack?.({ error: "Room is full." });
      return;
    }
    if (room.participants.find((p) => p.clientId === socket.id)) {
      ack?.({ ok: true });
      pushRoom(code);
      return;
    }

    const seatIndex = room.participants.length;
    room.participants.push({
      playerId: seatIndex + 1,
      name: playerName || `Player ${seatIndex + 1}`,
      color: COLORS[seatIndex].color,
      colorName: COLORS[seatIndex].colorName,
      clientId: socket.id,
    });

    socket.join(code);
    socket.data.roomCode = code;

    console.log(`[ROOM] ${playerName} joined ${code}`);
    ack?.({ ok: true });
    pushRoom(code);
  });

  // START_GAME
  socket.on("START_GAME", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostClientId !== socket.id) return;
    if (room.participants.length < 2) return;

    room.players = room.participants.map((p) => ({
      id: p.playerId,
      name: p.name,
      color: p.color,
      colorName: p.colorName,
      score: 0,
    }));

    room.board = generateSudokuBoard(36);
    room.status = "playing";
    room.phase = "playing";
    room.currentPlayerIndex = 0;
    room.winner = null;
    room.lastMoveCorrect = null;
    room.moveCount = 0;

    console.log(`[ROOM] ${roomCode} started`);
    pushRoom(roomCode);
  });

  // MAKE_MOVE
  socket.on("MAKE_MOVE", ({ roomCode, row, col, num, playerId }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== "playing" || !room.board) return;

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    const cell = room.board[row]?.[col];
    if (!cell || cell.isGiven || cell.value !== 0) return;

    const correct = checkPlacement(room.board, row, col, num);
    room.board[row][col].value = num;
    room.board[row][col].playerId = playerId;
    room.board[row][col].isCorrect = correct;

    if (correct) {
      const p = room.players.find((p) => p.id === playerId);
      if (p) p.score += 1;
    }

    room.lastMoveCorrect = correct;
    room.moveCount += 1;

    const full = isBoardFull(room.board);
    if (full) {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      room.winner = sorted[0];
      room.phase = "finished";
      room.status = "finished";
    } else {
      room.currentPlayerIndex =
        (room.currentPlayerIndex + 1) % room.players.length;
    }

    pushRoom(roomCode);
  });

  // NEW_PUZZLE
  socket.on("NEW_PUZZLE", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostClientId !== socket.id) return;

    room.board = generateSudokuBoard(36);
    room.players = room.players.map((p) => ({ ...p, score: 0 }));
    room.currentPlayerIndex = 0;
    room.phase = "playing";
    room.status = "playing";
    room.winner = null;
    room.lastMoveCorrect = null;
    room.moveCount = 0;

    console.log(`[ROOM] ${roomCode} new puzzle`);
    pushRoom(roomCode);
  });

  // RESTART
  socket.on("RESTART", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostClientId !== socket.id) return;

    room.status = "waiting";
    room.phase = "setup";
    room.board = null;
    room.players = [];
    room.currentPlayerIndex = 0;
    room.winner = null;
    room.lastMoveCorrect = null;
    room.moveCount = 0;

    console.log(`[ROOM] ${roomCode} back to lobby`);
    pushRoom(roomCode);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`[-] disconnected: ${socket.id}`);
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    room.participants = room.participants.filter(
      (p) => p.clientId !== socket.id
    );

    if (room.participants.length === 0) {
      rooms.delete(code);
      console.log(`[ROOM] ${code} deleted (empty)`);
      return;
    }

    // Transfer host if needed
    if (room.hostClientId === socket.id) {
      room.hostClientId = room.participants[0].clientId;
      console.log(`[ROOM] ${code} host → ${room.participants[0].name}`);
    }

    // Remove from active players if game is running
    if (room.status === "playing" && room.players.length > 0) {
      const gone = room.players.find(
        (p) => !room.participants.find((pt) => pt.playerId === p.id)
      );
      if (gone) {
        room.players = room.players.filter((p) => p.id !== gone.id);
        if (room.players.length === 0) {
          room.status = "waiting";
          room.phase = "setup";
        } else {
          room.currentPlayerIndex =
            room.currentPlayerIndex % room.players.length;
        }
      }
    }

    if (room.participants.length === 1 && room.status === "playing") {
      room.status = "finished";
      room.phase = "finished";
      room.winner = room.players[0] ?? null;
    }

    pushRoom(code);
  });
});

// ── Static (production) ───────────────────────────────────────────────────────
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`Sudoku server → http://localhost:${PORT}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Sudoku logic (server-side — authoritative validation)
// ═════════════════════════════════════════════════════════════════════════════

function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell.value !== 0));
}

function checkPlacement(board, row, col, num) {
  return board[row][col].solvedValue === num;
}

function generateSudokuBoard(givenCount = 36) {
  const grid = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => ({
      row: r, col: c, value: 0, isGiven: false,
      playerId: null, isCorrect: null, solvedValue: 0,
    }))
  );

  fillGrid(grid);

  const solved = grid.map((row) => row.map((c) => c.value));

  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let toRemove = 81 - givenCount;
  for (const pos of positions) {
    if (toRemove <= 0) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (grid[r][c].value !== 0) {
      grid[r][c].value = 0;
      toRemove--;
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      grid[r][c].isGiven = grid[r][c].value !== 0;
      grid[r][c].solvedValue = solved[r][c];
    }
  }

  return grid;
}

function fillGrid(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c].value === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(grid, r, c, num)) {
            grid[r][c].value = num;
            if (fillGrid(grid)) return true;
            grid[r][c].value = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i].value === num) return false;
    if (grid[i][col].value === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c].value === num) return false;
  return true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
