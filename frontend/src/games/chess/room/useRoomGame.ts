import { useStompRoomTransport } from "../../../multiplayer/transport/useStompRoomTransport";
import type { WSRole } from "../../../multiplayer/transport/useStompRoomTransport";
import type { RoomState } from "./ChessRoomTypes";
import type { MovePayload } from "../chessScene";

export function useRoomGame() {
  const config = {
    gameKey: "chess",
    createDestination: "/app/chess/create",
    joinDestination: "/app/chess/join",
    leaveDestination: "/app/chess/leave",
    startDestination: "/app/chess/start",
  };

  const ws = useStompRoomTransport<RoomState>(config);

  const sendMove = (payload: MovePayload) => {
    if (!ws.roomState) return;

    ws.sendAction("/app/chess/move", {
      roomCode: ws.roomState.roomCode,
      from: payload.from,
      to: payload.to,
      resultingState: payload.resultingState,
    });
  };

  const resetGame = () => {
    if (!ws.roomState) return;

    ws.sendAction("/app/chess/reset", {
      roomCode: ws.roomState.roomCode,
    });
  };

  return {
    config: config,
    transport: "websocket" as const,
    role: ws.role as WSRole,
    roomState: ws.roomState,
    myClientId: ws.myClientId,
    isHost: ws.role === "host",
    joinError: ws.joinError,
    isConnected: ws.isConnected,

    createRoom: (hostName: string) =>
      ws.createRoom({
        hostName,
        clientToken: ws.myClientId,
      }),

    joinRoom: (roomCode: string, playerName: string) =>
      ws.joinRoom({
        roomCode: roomCode.trim().toUpperCase(),
        playerName,
        clientToken: ws.myClientId,
      }),

    leaveRoom: () => {
      if (!ws.roomState) return;
      ws.leaveRoom({ roomCode: ws.roomState.roomCode });
    },

    startGame: () => {
      if (!ws.roomState) return;
      ws.startGame({ roomCode: ws.roomState.roomCode });
    },

    sendMove,
    resetGame,
  };
}