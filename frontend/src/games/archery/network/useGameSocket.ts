/**
 * useGameSocket.ts
 * Manages the WebSocket connection to the game server.
 *
 * URL strategy:
 *  - VITE_WS_URL env var set       → use it directly  (set on Render dashboard)
 *  - localhost / 127.0.0.1         → ws://localhost:5173/ws  (Vite proxy → :3001)
 *  - Any other host (production)   → wss://<same-host>/ws   (Render: server serves both)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Shared types (mirrors server types, without ws refs) ─────────────────────

export interface ArrowScore {
  round : number;
  score : number;
  dist  : number;
}

export interface RoomPlayer {
  id     : string;
  name   : string;
  color  : string;
  scores : ArrowScore[];
  total  : number;
  ready  : boolean;
  slotIdx: number;
}

export interface RoomSnapshot {
  id            : string;
  hostId        : string;
  maxPlayers    : number;
  state         : 'waiting' | 'playing' | 'finished';
  currentSlot   : number;
  currentRound  : number;
  arrowsFired   : number;
  totalRounds   : number;
  arrowsPerRound: number;
  windForce     : number;
  players       : RoomPlayer[];
}

export type ServerEvent =
  | { type: 'room_created';  roomId: string; playerId: string; slotIdx: number; room: RoomSnapshot }
  | { type: 'room_joined';   roomId: string; playerId: string; slotIdx: number; room: RoomSnapshot }
  | { type: 'player_joined'; room: RoomSnapshot }
  | { type: 'player_ready';  playerId: string; room: RoomSnapshot }
  | { type: 'player_left';   leftId: string; room: RoomSnapshot }
  | { type: 'game_start';    room: RoomSnapshot }
  | { type: 'arrow_scored';  playerId: string; slotIdx: number; score: number; dist: number; room: RoomSnapshot }
  | { type: 'turn_update';   room: RoomSnapshot }
  | { type: 'game_over';     room: RoomSnapshot }
  | { type: 'pong' }
  | { type: 'error';         message: string };

// ─── WS URL resolver ──────────────────────────────────────────────────────────

function getWsUrl(): string {
  // 1. Explicit override via env var (e.g. set on Render: VITE_WS_URL=wss://xxx.onrender.com/ws)
  const envUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (envUrl) {
    console.log('[WS] using VITE_WS_URL:', envUrl);
    return envUrl;
  }

  const { hostname, port, protocol } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) {
    // Dev: go through the Vite proxy  (/ws → localhost:3001/ws)
    // Use the same port as the Vite dev server (5173 or whatever)
    const devPort = port || '5173';
    const url = `ws://${hostname}:${devPort}/ws`;
    console.log('[WS] dev mode → Vite proxy:', url);
    return url;
  }

  // Production (Render): server and client on same domain/port
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  const wsPort  = port ? `:${port}` : '';
  const url = `${wsProto}//${hostname}${wsPort}/ws`;
  console.log('[WS] production mode:', url);
  return url;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseGameSocketReturn {
  connected    : boolean;
  room         : RoomSnapshot | null;
  myId         : string;
  mySlot       : number;
  error        : string | null;
  lastEvent    : ServerEvent | null;
  createRoom   : (playerName: string, maxPlayers: number) => void;
  joinRoom     : (roomId: string, playerName: string) => void;
  setReady     : () => void;
  hostStart    : () => void;
  sendArrowShot: (score: number, dist: number) => void;
  clearError   : () => void;
}

const RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT      = 8;

export function useGameSocket(): UseGameSocketReturn {
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef     = useRef(true);

  const [connected,  setConnected]  = useState(false);
  const [room,       setRoom]       = useState<RoomSnapshot | null>(null);
  const [myId,       setMyId]       = useState('');
  const [mySlot,     setMySlot]     = useState(0);
  const [error,      setError]      = useState<string | null>(null);
  const [lastEvent,  setLastEvent]  = useState<ServerEvent | null>(null);

  // ── Connect (called on mount and on reconnect) ───────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Tear down old socket cleanly
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const url = getWsUrl();
    console.log(`[WS] connecting (attempt ${reconnectCount.current + 1}) → ${url}`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('[WS] WebSocket constructor failed:', e);
      setError('Cannot connect to game server. Make sure the server is running (npm run dev:server).');
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WS] ✓ connected');
      reconnectCount.current = 0;
      setConnected(true);
      setError(null);
    };

    ws.onclose = (ev) => {
      if (!mountedRef.current) return;
      console.log('[WS] closed', ev.code, ev.reason || '');
      setConnected(false);

      if (ev.code === 1000) return; // clean close, don't reconnect

      if (reconnectCount.current < MAX_RECONNECT) {
        reconnectCount.current++;
        const delay = RECONNECT_DELAY_MS * Math.min(reconnectCount.current, 4);
        setError(`Connection lost. Reconnecting… (${reconnectCount.current}/${MAX_RECONNECT})`);
        console.log(`[WS] retrying in ${delay}ms…`);
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setError(
          'Cannot reach the game server.\n' +
          'Make sure you ran: npm run dev:server\n' +
          'Then refresh the page.'
        );
      }
    };

    ws.onerror = () => {
      // onclose fires right after — error message is shown there
      console.warn('[WS] connection error');
    };

    ws.onmessage = (ev) => {
      if (!mountedRef.current) return;
      let msg: ServerEvent;
      try { msg = JSON.parse(ev.data as string); }
      catch { return; }

      setLastEvent(msg);

      switch (msg.type) {
        case 'room_created':
        case 'room_joined':
          setMyId(msg.playerId);
          setMySlot(msg.slotIdx);
          setRoom(msg.room);
          setError(null);
          break;

        case 'player_joined':
        case 'player_ready':
        case 'player_left':
        case 'game_start':
        case 'arrow_scored':
        case 'turn_update':
        case 'game_over':
          setRoom(msg.room);
          break;

        case 'error':
          setError(msg.message);
          break;

        case 'pong':
          break;
      }
    };
  }, []); // stable reference

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close(1000, 'unmount');
      }
    };
  }, [connect]);

  // ── Send helper ──────────────────────────────────────────────────────────────
  const sendMsg = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] sendMsg called but socket not open (state:', ws?.readyState, ')');
    }
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────────
  const createRoom = useCallback((playerName: string, maxPlayers: number) =>
    sendMsg({ type: 'create', playerName, maxPlayers }), [sendMsg]);

  const joinRoom = useCallback((roomId: string, playerName: string) =>
    sendMsg({ type: 'join', roomId: roomId.trim().toUpperCase(), playerName }), [sendMsg]);

  const setReady = useCallback(() => sendMsg({ type: 'ready' }), [sendMsg]);

  const hostStart = useCallback(() => sendMsg({ type: 'host_start' }), [sendMsg]);

  const sendArrowShot = useCallback((score: number, dist: number) =>
    sendMsg({ type: 'arrow_shot', score, dist }), [sendMsg]);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected, room, myId, mySlot, error, lastEvent,
    createRoom, joinRoom, setReady, hostStart, sendArrowShot, clearError,
  };
}
