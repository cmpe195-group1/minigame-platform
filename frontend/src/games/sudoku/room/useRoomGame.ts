import { useWebSocketTransport } from "./websocketTransport";
import type { RoomState } from "./RoomTypes";

export type RoomRole = "none" | "host" | "guest";

export interface UseRoomGameReturn {
  transport: "websocket";
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

export function useRoomGame(): UseRoomGameReturn {
  const ws = useWebSocketTransport();

  return {
    transport: "websocket",
    role: ws.role as RoomRole,
    roomState: ws.roomState,
    myClientId: ws.myClientId,
    isHost: ws.role === "host",
    joinError: ws.joinError,
    isConnected: ws.isConnected,
    createRoom: ws.createRoom,
    joinRoom: ws.joinRoom,
    leaveRoom: ws.leaveRoom,
    startGame: ws.startGame,
    makeMove: ws.makeMove,
    handleNewPuzzle: ws.handleNewPuzzle,
    handleRestart: ws.handleRestart,
  };
}
