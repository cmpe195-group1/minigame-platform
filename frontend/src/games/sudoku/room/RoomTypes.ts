// ─── Room Types ────────────────────────────────────────────────────────────────

import type { Board } from "../game/SudokuBoard";
import type { Player } from "../game/Player";
import type { GamePhase } from "../game/GameManager";

/** Mode chosen on the main menu */
export type AppMode = "menu" | "local" | "room-host" | "room-join" | "room-game";

/** Transport layer chosen at runtime */
export type RoomTransport = "broadcast" | "websocket";

/** A room participant (one per connected client / tab) */
export interface RoomParticipant {
  playerId: number;
  name: string;
  color: string;
  colorName: string;
  /** socketId in WebSocket mode, tabId in BroadcastChannel mode */
  clientId: string;
}

/** Room status */
export type RoomStatus = "waiting" | "playing" | "finished";

/** Full room state — broadcast to every participant */
export interface RoomState {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  participants: RoomParticipant[];
  status: RoomStatus;
  transport: RoomTransport;

  // Game state
  board: Board | null;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: Player | null;
  lastMoveCorrect: boolean | null;
  moveCount: number;
}

// ─── Message shapes (used by BroadcastChannel transport) ─────────────────────

export type RoomMessageType =
  | "ROOM_STATE"
  | "JOIN_REQUEST"
  | "MAKE_MOVE"
  | "START_GAME"
  | "NEW_PUZZLE"
  | "RESTART"
  | "PING"
  | "PONG";

export interface RoomMessage {
  type: RoomMessageType;
  roomCode: string;
  payload?: unknown;
}

// ─── Socket.IO event payloads ─────────────────────────────────────────────────

export interface CreateRoomPayload {
  hostName: string;
  maxPlayers: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface MakeMovePayload {
  roomCode: string;
  row: number;
  col: number;
  num: number;
  playerId: number;
}

export interface JoinAck {
  ok?: boolean;
  error?: string;
}
