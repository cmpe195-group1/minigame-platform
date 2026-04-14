import { useWebSocketTransport } from "./websocketTransport";

export type RoomRole = "none" | "host" | "guest";

export function useRoomGame() {
  const ws = useWebSocketTransport();

  return {
    transport: "websocket" as const,
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
    sendMove: ws.sendMove,
    resetGame: ws.resetGame,
  };
}
