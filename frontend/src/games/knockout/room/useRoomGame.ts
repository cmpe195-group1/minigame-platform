import { useStompRoomTransport } from "../../../multiplayer/transport/useStompRoomTransport";
import type { WSRole } from "../../../multiplayer/transport/useStompRoomTransport";
import type { KnockoutGameState, LocalShotPayload } from "../types";
import type { RoomState } from "./KnockoutRoomTypes";

export function useRoomGame() {
  const config = {
    gameKey: "knockout",
    createDestination: "/app/knockout/create",
    joinDestination: "/app/knockout/join",
    leaveDestination: "/app/knockout/leave",
    startDestination: "/app/knockout/start",
    gameTitle: "Knockout",
    createLabel: "Create Room",
    joinLabel: "Join Room",
    roomCodeLabel: "Room Code",
    playerNameLabel: "Player Name",
  };

  const ws = useStompRoomTransport<RoomState>(config);

  const sendShot = (payload: LocalShotPayload) => {
    if (!ws.roomState) return;
    ws.sendAction("/app/knockout/shot", {
      roomCode: ws.roomState.roomCode,
      turnNumber: payload.turnNumber,
      puckId: payload.puckId,
      impulseX: payload.impulseX,
      impulseY: payload.impulseY,
    });
  };

  const resolveTurn = (resultingState: KnockoutGameState) => {
    if (!ws.roomState) return;
    ws.sendAction("/app/knockout/resolveTurn", {
      roomCode: ws.roomState.roomCode,
      resultingState,
    });
  };

  const resetGame = () => {
    if (!ws.roomState) return;
    ws.sendAction("/app/knockout/reset", {
      roomCode: ws.roomState.roomCode,
    });
  };

  return {
    config,
    transport: "websocket" as const,
    role: ws.role as WSRole,
    roomState: ws.roomState,
    myClientId: ws.myClientId,
    isHost: ws.role === "host",
    joinError: ws.joinError,
    isConnected: ws.isConnected,

    createRoom: (hostName: string) => ws.createRoom({ hostName, clientToken: ws.myClientId }),
    joinRoom: (roomCode: string, playerName: string) =>
      ws.joinRoom({ roomCode: roomCode.trim().toUpperCase(), playerName, clientToken: ws.myClientId }),
    leaveRoom: () => {
      if (!ws.roomState) return;
      ws.leaveRoom({ roomCode: ws.roomState.roomCode });
    },
    startGame: () => {
      if (!ws.roomState) return;
      ws.startGame({ roomCode: ws.roomState.roomCode });
    },
    sendShot,
    resolveTurn,
    resetGame,
  };
}
