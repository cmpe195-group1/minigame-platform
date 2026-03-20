// ─── Transport Interface ───────────────────────────────────────────────────────
import type { RoomState } from "./RoomTypes";

export interface RoomTransportHandle {
  isConnected: boolean;
  myClientId: string | null;
  joinError: string | null;

  createRoom: (hostName: string, maxPlayers: number) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  makeMove: (row: number, col: number, num: number) => void;
  handleNewPuzzle: () => void;
  handleRestart: () => void;
}

export type OnRoomState = (state: RoomState) => void;
