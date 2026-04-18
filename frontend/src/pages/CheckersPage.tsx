import { useCallback } from "react";
import CheckersMainMenu from "../games/checkers/components/CheckersMainMenu";
import BaseRoomSetup from "@/multiplayer/ui/RoomSetup";
import RoomLobby from "@/multiplayer/ui/RoomLobby";
import CheckersRoomGameView from "../games/checkers/components/CheckersRoomGameView";
import { useRoomGame } from "../games/checkers/room/useRoomGame";
import type { CheckersSceneStatusExtra } from "../games/checkers/checkersScene";
import type { Player } from "../games/checkers/types";
import { useMultiplayerPageFlow } from "@/multiplayer/ui/ScreenFlow";
import LocalSetupCard from "@/multiplayer/ui/LocalSetupCard";
import PreparingRoom from "@/multiplayer/ui/PreparingRoom";
import PageCrashFallback from "@/multiplayer/ui/PageCrashFallback";
import CheckersLocalGameView, { defaultLocalStatus } from "@/games/checkers/components/CheckersLocalGameView";

export default function CheckersPage() {
  const room = useRoomGame();

  const {
    setScreen,
    activeScreen,
    localStatus,
    setLocalStatus,
    resetLocalStatus,
  } = useMultiplayerPageFlow({
    defaultLocalStatus,
    room,
  });

  const handleLocalStatusChange = useCallback(
    (status: "playing" | "game_over", turn: Player, extra?: CheckersSceneStatusExtra) => {
      setLocalStatus({
        status,
        turn,
        winner: extra?.winner ?? null,
        whitePieces: extra?.whitePieces ?? defaultLocalStatus.whitePieces,
        blackPieces: extra?.blackPieces ?? defaultLocalStatus.blackPieces,
      });
    },
    [setLocalStatus]
  );

  const handleCreateRoom = useCallback((hostName: string) => {
    room.createRoom(hostName);
    setScreen("room-lobby");
  }, [room, setScreen]);

  const handleJoinRoom = useCallback((roomCode: string, playerName: string) => {
    room.joinRoom(roomCode, playerName);
  }, [room]);

  const handleLeaveRoom = useCallback(() => {
    room.leaveRoom();
    setScreen("main-menu");
  }, [room, setScreen]);

  switch (activeScreen) {
    case "main-menu":
      return (
        <CheckersMainMenu
          onSelectLocal={() => {
            resetLocalStatus();
            setScreen("local-setup");
          }}
          onSelectRoom={() => setScreen("room-setup")}
        />
      );

    case "local-setup":
      return (
        <LocalSetupCard
          title="Local Checkers"
          subtitle="Two players share one board on this device."
          notes={[
            "White moves first.",
            "Captures are enforced by the game scene.",
            "Multi-jumps stay on the same turn until the capture chain ends.",
          ]}
          startLabel="Start Local Match"
          onBack={() => setScreen("main-menu")}
          onStart={() => {
            resetLocalStatus();
            setScreen("local-game");
          }}
        />
      );

    case "local-game":
      return (
        <CheckersLocalGameView
          localStatus={localStatus}
          onStatusChange={handleLocalStatusChange}
          onBack={() => setScreen("main-menu")}
        />
      );

    case "room-setup":
      return (
        <BaseRoomSetup
          config={room.config}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={() => setScreen("main-menu")}
          joinError={room.joinError}
          isConnected={room.isConnected}
        />
      );

    case "room-lobby":
      return room.roomState ? (
        <RoomLobby
          roomState={room.roomState}
          myClientId={room.myClientId}
          onStartGame={room.startGame}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <PreparingRoom gameTitle="Checkers" joinError={room.joinError} />
      );

    case "room-game":
      return room.roomState ? (
        <CheckersRoomGameView
          roomState={room.roomState}
          myClientId={room.myClientId}
          isHost={room.isHost}
          onSendMove={room.sendMove}
          onReset={room.resetGame}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <PreparingRoom gameTitle="Checkers" joinError={room.joinError} />
      );

    default:
      return <PageCrashFallback onBack={() => setScreen("main-menu")} />;
  }
}