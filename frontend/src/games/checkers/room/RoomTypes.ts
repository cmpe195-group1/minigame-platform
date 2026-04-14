import type { CheckersState, Player } from "../types";

export interface RoomParticipant {
  playerId: number;
  name: string;
  clientId: string;
  pieceColor: Player;
}

export interface RoomState {
  roomCode: string;
  hostClientId: string;
  maxPlayers: number;
  transport: "websocket";
  participants: RoomParticipant[];
  status: "waiting" | "playing" | "finished";
  gameState: CheckersState | null;
  winner: Player | null;
  moveCount: number;
}
