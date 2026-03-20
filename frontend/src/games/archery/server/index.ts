/**
 * server/index.ts
 * WebSocket + Express server for Archery Multiplayer.
 *
 * Runs on:
 *   - localhost:3001  (npm run dev:server  →  tsx watch server/index.ts)
 *   - Render.com      (node server/dist/index.js  after  npm run build:server)
 *
 * Render notes:
 *   Build Command : npm run build && npm run build:server
 *   Start Command : node server/dist/index.js
 *   Render sets PORT automatically.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM doesn't have __dirname — we derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArrowScore {
  round : number;
  score : number;
  dist  : number;
}

interface RoomPlayer {
  id      : string;
  name    : string;
  color   : string;
  scores  : ArrowScore[];
  total   : number;
  ready   : boolean;
  ws      : WebSocket;
  slotIdx : number;
  isAlive : boolean;
}

interface Room {
  id            : string;
  hostId        : string;
  players       : RoomPlayer[];
  maxPlayers    : number;
  state         : 'waiting' | 'playing' | 'finished';
  currentSlot   : number;
  currentRound  : number;
  arrowsFired   : number;
  totalRounds   : number;
  arrowsPerRound: number;
  windForce     : number;
}

// ─── State ────────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

const PLAYER_COLORS    = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const TOTAL_ROUNDS     = 3;
const ARROWS_PER_ROUND = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function freshWind(): number {
  return parseFloat((Math.random() * 160 - 80).toFixed(1));
}

/** Send JSON to one socket safely */
function send(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Broadcast JSON to every player in a room */
function broadcast(room: Room, msg: object, exclude?: string) {
  for (const p of room.players) {
    if (exclude && p.id === exclude) continue;
    send(p.ws, msg);
  }
}

/** Sanitised room snapshot (no ws refs) */
function roomSnapshot(room: Room) {
  return {
    id            : room.id,
    hostId        : room.hostId,
    maxPlayers    : room.maxPlayers,
    state         : room.state,
    currentSlot   : room.currentSlot,
    currentRound  : room.currentRound,
    arrowsFired   : room.arrowsFired,
    totalRounds   : room.totalRounds,
    arrowsPerRound: room.arrowsPerRound,
    windForce     : room.windForce,
    players       : room.players.map(p => ({
      id     : p.id,
      name   : p.name,
      color  : p.color,
      scores : p.scores,
      total  : p.total,
      ready  : p.ready,
      slotIdx: p.slotIdx,
    })),
  };
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

function handleCreate(ws: WebSocket, data: { playerName: string; maxPlayers: number }) {
  const roomId   = makeRoomId();
  const playerId = uuidv4();

  const room: Room = {
    id            : roomId,
    hostId        : playerId,
    players       : [],
    maxPlayers    : Math.min(Math.max(Number(data.maxPlayers) || 2, 2), 4),
    state         : 'waiting',
    currentSlot   : 0,
    currentRound  : 1,
    arrowsFired   : 0,
    totalRounds   : TOTAL_ROUNDS,
    arrowsPerRound: ARROWS_PER_ROUND,
    windForce     : freshWind(),
  };

  const player: RoomPlayer = {
    id     : playerId,
    name   : (data.playerName || 'Player 1').slice(0, 20),
    color  : PLAYER_COLORS[0],
    scores : [],
    total  : 0,
    ready  : false,
    ws,
    slotIdx: 0,
    isAlive: true,
  };

  room.players.push(player);
  rooms.set(roomId, room);

  send(ws, { type: 'room_created', roomId, playerId, slotIdx: 0, room: roomSnapshot(room) });
  console.log(`[Room] Created ${roomId} by "${player.name}"`);
  return player;
}

function handleJoin(ws: WebSocket, data: { roomId: string; playerName: string }) {
  const room = rooms.get((data.roomId ?? '').trim().toUpperCase());

  if (!room) {
    send(ws, { type: 'error', message: `Room "${data.roomId}" not found. Check the code and try again.` });
    return null;
  }
  if (room.state !== 'waiting') {
    send(ws, { type: 'error', message: 'This game has already started.' });
    return null;
  }
  if (room.players.length >= room.maxPlayers) {
    send(ws, { type: 'error', message: `Room is full (${room.maxPlayers}/${room.maxPlayers} players).` });
    return null;
  }

  const playerId = uuidv4();
  const slotIdx  = room.players.length;

  const player: RoomPlayer = {
    id     : playerId,
    name   : (data.playerName || `Player ${slotIdx + 1}`).slice(0, 20),
    color  : PLAYER_COLORS[slotIdx],
    scores : [],
    total  : 0,
    ready  : false,
    ws,
    slotIdx,
    isAlive: true,
  };

  room.players.push(player);

  send(ws, { type: 'room_joined', roomId: room.id, playerId, slotIdx, room: roomSnapshot(room) });
  broadcast(room, { type: 'player_joined', room: roomSnapshot(room) }, playerId);

  console.log(`[Room] "${player.name}" joined ${room.id} (slot ${slotIdx})`);
  return { room, player };
}

function handleReady(room: Room, player: RoomPlayer) {
  player.ready = true;
  broadcast(room, { type: 'player_ready', playerId: player.id, room: roomSnapshot(room) });

  const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
  if (allReady) {
    room.state     = 'playing';
    room.windForce = freshWind();
    broadcast(room, { type: 'game_start', room: roomSnapshot(room) });
    console.log(`[Room] ${room.id} started (all ready)`);
  }
}

function handleHostStart(room: Room, player: RoomPlayer) {
  if (player.id !== room.hostId) {
    send(player.ws, { type: 'error', message: 'Only the host can force-start.' });
    return;
  }
  if (room.players.length < 2) {
    send(player.ws, { type: 'error', message: 'Need at least 2 players to start.' });
    return;
  }
  room.state     = 'playing';
  room.windForce = freshWind();
  broadcast(room, { type: 'game_start', room: roomSnapshot(room) });
  console.log(`[Room] ${room.id} force-started by "${player.name}"`);
}

function handleArrowShot(room: Room, player: RoomPlayer, data: { score: number; dist: number }) {
  if (room.state !== 'playing') return;

  if (room.players[room.currentSlot]?.id !== player.id) {
    send(player.ws, { type: 'error', message: "It's not your turn!" });
    return;
  }

  const score = Math.max(0, Math.min(10, Math.round(Number(data.score) || 0)));
  const dist  = Math.max(0, Number(data.dist) || 0);

  player.scores.push({ round: room.currentRound, score, dist });
  player.total += score;
  room.arrowsFired++;

  console.log(`[Shot] "${player.name}" scored ${score} (dist: ${dist.toFixed(1)}px), arrow ${room.arrowsFired}/${room.arrowsPerRound}`);

  broadcast(room, {
    type    : 'arrow_scored',
    playerId: player.id,
    slotIdx : player.slotIdx,
    score,
    dist,
    room    : roomSnapshot(room),
  });

  // Still arrows left for this player in this turn
  if (room.arrowsFired < room.arrowsPerRound) {
    broadcast(room, { type: 'turn_update', room: roomSnapshot(room) });
    return;
  }

  // Advance to next player
  room.arrowsFired = 0;
  room.currentSlot++;

  if (room.currentSlot >= room.players.length) {
    room.currentSlot = 0;
    room.currentRound++;

    if (room.currentRound > room.totalRounds) {
      room.state = 'finished';
      broadcast(room, { type: 'game_over', room: roomSnapshot(room) });
      console.log(`[Room] ${room.id} game over`);
      return;
    }
  }

  room.windForce = freshWind();
  broadcast(room, { type: 'turn_update', room: roomSnapshot(room) });
}

function handleDisconnect(ws: WebSocket) {
  for (const [roomId, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.ws === ws);
    if (idx === -1) continue;

    const leaving = room.players.splice(idx, 1)[0];
    console.log(`[Room] "${leaving.name}" left ${roomId}`);

    if (room.players.length === 0) {
      rooms.delete(roomId);
      console.log(`[Room] ${roomId} deleted (empty)`);
      return;
    }

    // Re-assign slots & colours
    room.players.forEach((p, i) => { p.slotIdx = i; p.color = PLAYER_COLORS[i]; });
    if (leaving.id === room.hostId) room.hostId = room.players[0].id;
    if (room.currentSlot >= room.players.length) room.currentSlot = 0;

    broadcast(room, { type: 'player_left', leftId: leaving.id, room: roomSnapshot(room) });

    if (room.state === 'playing' && room.players.length < 2) {
      room.state = 'finished';
      broadcast(room, { type: 'game_over', room: roomSnapshot(room) });
    }
    return;
  }
}

// ─── Express + HTTP + WebSocket ───────────────────────────────────────────────

const app  = express();
const http = createServer(app);
const wss  = new WebSocketServer({ server: http, path: '/ws' });

// Health-check (Render uses this)
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    rooms  : rooms.size,
    players: [...rooms.values()].reduce((n, r) => n + r.players.length, 0),
    uptime : process.uptime(),
  });
});

// Serve the built React app in production
// server/dist/index.js → ../../dist  (2 levels up from server/dist/)
// tsx server/index.ts  → ../dist     (1 level up from server/)
const isCompiled = __filename.endsWith('.js');
const distDir = path.resolve(__dirname, isCompiled ? '../../dist' : '../dist');

app.use(express.static(distDir));
app.get('/{*splat}', (_req, res) => {
  const indexFile = path.join(distDir, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(200).send('Server running. In dev mode the React app is at http://localhost:5173');
    }
  });
});;

// ─── WebSocket connection handler ─────────────────────────────────────────────

type ExtWS = WebSocket & { isAlive: boolean };

wss.on('connection', (ws: WebSocket, req) => {
  const ext       = ws as ExtWS;
  ext.isAlive     = true;
  let myRoom      : Room       | undefined;
  let myPlayer    : RoomPlayer | undefined;

  console.log(`[WS] connect from ${req.socket.remoteAddress}`);

  ws.on('pong', () => {
    ext.isAlive = true;
    if (myPlayer) myPlayer.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg: { type: string; [k: string]: unknown };
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    switch (msg.type) {

      case 'create': {
        const p = handleCreate(ws, msg as unknown as { playerName: string; maxPlayers: number });
        for (const r of rooms.values()) {
          if (r.players.find(x => x.ws === ws)) { myRoom = r; myPlayer = p; }
        }
        break;
      }

      case 'join': {
        const res = handleJoin(ws, msg as unknown as { roomId: string; playerName: string });
        if (res) { myRoom = res.room; myPlayer = res.player; }
        break;
      }

      case 'ready':
        if (myRoom && myPlayer) handleReady(myRoom, myPlayer);
        break;

      case 'host_start':
        if (myRoom && myPlayer) handleHostStart(myRoom, myPlayer);
        break;

      case 'arrow_shot':
        if (myRoom && myPlayer) {
          handleArrowShot(myRoom, myPlayer, msg as unknown as { score: number; dist: number });
        }
        break;

      case 'ping':
        send(ws, { type: 'pong' });
        break;
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WS] close ${code} ${reason?.toString() || ''}`);
    handleDisconnect(ws);
  });

  ws.on('error', (err) => console.error('[WS] error:', err.message));
});

// ─── Heartbeat: drop dead connections every 30s ───────────────────────────────

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    const ext = ws as ExtWS;
    if (!ext.isAlive) { ws.terminate(); return; }
    ext.isAlive = false;
    ws.ping();
  });
}, 30_000);

wss.on('close', () => clearInterval(heartbeat));

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏹  Archery server ready on port ${PORT}`);
  console.log(`   WS  : ws://localhost:${PORT}/ws`);
  console.log(`   HTTP: http://localhost:${PORT}/health`);
  console.log(`   Mode: ${isCompiled ? 'compiled/production' : 'development'}\n`);
});
