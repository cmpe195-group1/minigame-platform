// ─── useRoomGame ───────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useBroadcastTransport } from "./broadcastTransport";
import { useWebSocketTransport } from "./websocketTransport";
import type { RoomState } from "./RoomTypes";

// ── Detect environment ────────────────────────────────────────────────────────
function isLocalhost(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

// ── Public return type ────────────────────────────────────────────────────────
export type RoomRole = "none" | "host" | "guest";

export interface UseRoomGameReturn {
  transport: "broadcast" | "websocket";
  role: RoomRole;
  roomState: RoomState | null;
  myClientId: string | null;
  isHost: boolean;
  joinError: string | null;
  isConnected: boolean;

  createRoom: (hostName: string, maxPlayers: number) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  makeMove: (row: number, col: number, num: number) => void;
  handleNewPuzzle: () => void;
  handleRestart: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRoomGame(): UseRoomGameReturn {
  const transport = useMemo<"broadcast" | "websocket">(
    () => (isLocalhost() ? "broadcast" : "websocket"),
    []
  );

  const bc = useBroadcastTransport();
  const ws = useWebSocketTransport();

  // Select the active transport
  const active = transport === "broadcast" ? bc : ws;

  return {
    transport,
    role: active.role as RoomRole,
    roomState: active.roomState,
    myClientId: active.myClientId,
    isHost: active.role === "host",
    joinError: active.joinError,
    isConnected: active.isConnected,
    createRoom: active.createRoom,
    joinRoom: active.joinRoom,
    leaveRoom: active.leaveRoom,
    startGame: active.startGame,
    makeMove: active.makeMove,
    handleNewPuzzle: active.handleNewPuzzle,
    handleRestart: active.handleRestart,
  };
}
