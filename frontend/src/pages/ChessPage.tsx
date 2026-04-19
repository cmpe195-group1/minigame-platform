import { useCallback } from "react";
import ChessMainMenu from "../games/chess/components/ChessMainMenu";
import BaseRoomSetup from "@/multiplayer/ui/RoomSetup";
import RoomLobby from "@/multiplayer/ui/RoomLobby";
import ChessRoomGameView from "../games/chess/components/ChessRoomGameView";
import { useRoomGame } from "../games/chess/room/useRoomGame";
import type { Player } from "../games/chess/types";
import { useMultiplayerPageFlow } from "@/multiplayer/ui/ScreenFlow";
import LocalSetupCard from "@/multiplayer/ui/LocalSetupCard";
import PreparingRoom from "@/multiplayer/ui/PreparingRoom";
import PageCrashFallback from "@/multiplayer/ui/PageCrashFallback";
import ChessLocalGameView, { defaultLocalStatus } from "@/games/chess/components/ChessLocalView";

export default function ChessPage() {
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

  /*
  const handleLocalStatusChange = useCallback()
    [setLocalStatus]
  );
  */

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
        <ChessMainMenu
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
          title="Local Chess"
          subtitle="Two players share one board on this device."
          notes={[
            "White moves first.",
            "Captures are enforced by the game scene.",
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
      /*
      return (
        <CheckersLocalGameView
          localStatus={localStatus}
          onStatusChange={handleLocalStatusChange}
          onBack={() => setScreen("main-menu")}
        />
      );
      */
     return (
      <ChessLocalGameView localStatus={localStatus} onBack={function (): void {
         throw new Error("Function not implemented.");
       } }/>
     )

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
        <PreparingRoom gameTitle="Chess" joinError={room.joinError} />
      );

    case "room-game":
      return room.roomState ? (
        <ChessRoomGameView
          roomState={room.roomState}
          myClientId={room.myClientId}
          isHost={room.isHost}
          onSendMove={room.sendMove}
          onReset={room.resetGame}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <PreparingRoom gameTitle="Chess" joinError={room.joinError} />
      );

    default:
      return <PageCrashFallback onBack={() => setScreen("main-menu")} />;
  }
}