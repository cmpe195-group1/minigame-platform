import type { Board } from "../game/SudokuBoard";
import type { Player } from "../game/Player";
import type { GamePhase } from "../game/GameManager";

export type RoomTransport = "broadcast" | "websocket";

export interface RoomParticipant {
  playerId: number;
  name: string;
  color: string;
  colorName: string;
  clientId: string;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomState {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  participants: RoomParticipant[];
  status: RoomStatus;
  transport: RoomTransport;
  board: Board | null;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: Player | null;
  lastMoveCorrect: boolean | null;
  moveCount: number;
}

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
