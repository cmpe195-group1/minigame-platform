import { useCallback } from "react";

import KnockoutMainMenu from "@/games/knockout/components/KnockoutMainMenu";
import KnockoutLocalGameView from "@/games/knockout/components/KnockoutLocalGameView";
import KnockoutRoomGameView from "@/games/knockout/components/KnockoutRoomGameView";
import { useRoomGame } from "@/games/knockout/room/useRoomGame";
import type { KnockoutStatus } from "@/games/knockout/types";

import BaseRoomSetup from "@/multiplayer/ui/RoomSetup";
import { useMultiplayerPageFlow } from "@/multiplayer/ui/ScreenFlow";
import LocalSetupCard from "@/multiplayer/ui/LocalSetupCard";
import PreparingRoom from "@/multiplayer/ui/PreparingRoom";
import PageCrashFallback from "@/multiplayer/ui/PageCrashFallback";
import RoomLobby from "@/multiplayer/ui/RoomLobby";

const defaultLocalStatus: KnockoutStatus = {
  currentPlayer: "A",
  phase: "aiming",
  aRemaining: 6,
  bRemaining: 6,
  winner: null,
};

function KnockoutRoomLobby({
  roomState,
  myClientId,
  onStartGame,
  onLeave,
}: {
  roomState: ReturnType<typeof useRoomGame>["roomState"];
  myClientId: string | null;
  onStartGame: () => void;
  onLeave: () => void;
}) {
  if (!roomState) return null;

  const isHost = myClientId === roomState.hostClientId;
  const playersJoined = roomState.participants.length;
  const spotsLeft = Math.max(0, roomState.maxPlayers - playersJoined);
  const canStart = isHost && playersJoined >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Knockout Room</h1>
            <p className="text-blue-200/80 mt-2">
              Room code: <span className="font-mono font-bold text-white">{roomState.roomCode}</span>
            </p>
            <p className="text-sm text-blue-300 mt-1">
              {playersJoined}/{roomState.maxPlayers} players joined
            </p>
          </div>

          <button
            onClick={onLeave}
            className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
          >
            Leave
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-sm text-blue-200/80">
            {spotsLeft > 0
              ? `Waiting for ${spotsLeft} more player${spotsLeft === 1 ? "" : "s"}`
              : "Room is full"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {roomState.participants.map((participant) => (
            <div
              key={participant.clientId}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">{participant.name}</div>
                <div className="text-xs text-blue-200/80">Side {participant.side}</div>
              </div>
              <div className="text-xs text-blue-300">
                {participant.clientId === roomState.hostClientId ? "Host" : "Player"}
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full rounded-2xl py-4 bg-gradient-to-r from-blue-600 to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-xl"
          >
            Start Match
          </button>
        ) : (
          <div className="text-center text-blue-200/80 text-sm">
            Waiting for the host to start the game.
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnockoutPage() {
  const room = useRoomGame();

  const {
    setScreen,
    activeScreen,
    localStatus,
    setLocalStatus,
    resetLocalStatus,
  } = useMultiplayerPageFlow({
    defaultLocalStatus,
    room: {
      role: room.role,
      roomState: room.roomState,
    },
  });

  const handleLocalStatusChange = useCallback((status: KnockoutStatus) => {
    setLocalStatus(status);
  }, [setLocalStatus]);

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
        <KnockoutMainMenu
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
          title="Local Knockout"
          subtitle="Two players play on one device."
          notes={[
            "Player A shoots first.",
            "Knock your opponent’s pucks off the board.",
            "Turns switch only after all motion stops.",
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
        <KnockoutLocalGameView
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
        <PreparingRoom gameTitle="Knockout" joinError={room.joinError} />
      );

    case "room-game":
      return room.roomState ? (
        <KnockoutRoomGameView
          roomState={room.roomState}
          myClientId={room.myClientId}
          isHost={room.isHost}
          onSendShot={room.sendShot}
          onResolveTurn={room.resolveTurn}
          onReset={room.resetGame}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <PreparingRoom gameTitle="Knockout" joinError={room.joinError} />
      );

    default:
      return <PageCrashFallback onBack={() => setScreen("main-menu")} />;
  }
}