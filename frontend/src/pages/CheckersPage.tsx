import { useCallback, useState } from "react";
import CheckersGameWrapper from "../games/checkers/CheckersGameWrapper";
import CheckersMainMenu from "../games/checkers/components/CheckersMainMenu";
import CheckersRoomSetup from "../games/checkers/components/CheckersRoomSetup";
import CheckersRoomLobby from "../games/checkers/components/CheckersRoomLobby";
import CheckersRoomGameView from "../games/checkers/components/CheckersRoomGameView";
import { useRoomGame } from "../games/checkers/room/useRoomGame";
import type { CheckersSceneStatusExtra, MovePayload } from "../games/checkers/checkersScene";
import type { Player } from "../games/checkers/types";

type AppScreen =
  | "main-menu"
  | "local-setup"
  | "local-game"
  | "room-setup"
  | "room-lobby"
  | "room-game";

interface LocalStatus {
  status: "playing" | "game_over";
  turn: Player;
  winner: Player | null;
  whitePieces: number;
  blackPieces: number;
}

const defaultLocalStatus: LocalStatus = {
  status: "playing",
  turn: "white",
  winner: null,
  whitePieces: 12,
  blackPieces: 12,
};

export default function CheckersPage() {
  const [screen, setScreen] = useState<AppScreen>("main-menu");
  const [localStatus, setLocalStatus] = useState<LocalStatus>(defaultLocalStatus);
  const room = useRoomGame();

  const activeScreen: AppScreen =
    room.role !== "none" && room.roomState
      ? room.roomState.status === "waiting"
        ? "room-lobby"
        : "room-game"
      : screen;

  const handleLocalStatusChange = useCallback(
    (
      status: "playing" | "game_over",
      turn: Player,
      extra?: CheckersSceneStatusExtra
    ) => {
      setLocalStatus({
        status,
        turn,
        winner: extra?.winner ?? null,
        whitePieces: extra?.whitePieces ?? defaultLocalStatus.whitePieces,
        blackPieces: extra?.blackPieces ?? defaultLocalStatus.blackPieces,
      });
    },
    []
  );

  const handleCreateRoom = useCallback(
    (hostName: string) => {
      room.createRoom(hostName);
      setScreen("room-lobby");
    },
    [room]
  );

  const handleJoinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      room.joinRoom(roomCode, playerName);
    },
    [room]
  );

  const handleLeaveRoom = useCallback(() => {
    room.leaveRoom();
    setScreen("main-menu");
  }, [room]);

  const handleSendRoomMove = useCallback(
    (payload: MovePayload) => {
      room.sendMove(payload.from, payload.to, payload.resultingState);
    },
    [room]
  );

  if (activeScreen === "main-menu") {
    return (
      <CheckersMainMenu
        onSelectLocal={() => {
          setLocalStatus(defaultLocalStatus);
          setScreen("local-setup");
        }}
        onSelectRoom={() => setScreen("room-setup")}
      />
    );
  }

  if (activeScreen === "local-setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setScreen("main-menu")}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-sm"
            >
              ←
            </button>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Local Checkers</h2>
              <p className="text-sm text-blue-300">Two players share one board on this device.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100 space-y-2">
            <p className="font-semibold text-white">Before you start</p>
            <ul className="list-disc list-inside space-y-1 text-blue-200/80">
              <li>White moves first.</li>
              <li>Captures are enforced by the game scene.</li>
              <li>Multi-jumps stay on the same turn until the capture chain ends.</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setLocalStatus(defaultLocalStatus);
              setScreen("local-game");
            }}
            className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Local Match →
          </button>
        </div>
      </div>
    );
  }

  if (activeScreen === "local-game") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
        <header className="py-4 px-6 text-center flex-shrink-0">
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">
            ⛀ Checkers Local Match
          </h1>
          <p className="text-blue-300 text-sm mt-1">
            {localStatus.winner
              ? `${localStatus.winner === "white" ? "White" : "Black"} wins`
              : `${localStatus.turn === "white" ? "White" : "Black"} to move`}
          </p>
        </header>

        <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 px-4 pb-8">
          <div className="flex-shrink-0">
            <CheckersGameWrapper onStatusChange={handleLocalStatusChange} />
          </div>

          <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
            <div
              className={`rounded-2xl p-4 border text-sm ${
                localStatus.winner
                  ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <div className="font-bold mb-1">
                {localStatus.winner
                  ? `${localStatus.winner === "white" ? "White" : "Black"} wins`
                  : `${localStatus.turn === "white" ? "White" : "Black"} to move`}
              </div>
              <div className="text-xs opacity-90">
                White pieces: {localStatus.whitePieces} · Black pieces: {localStatus.blackPieces}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-white">
              <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-3">
                Match Notes
              </p>
              <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
                <li>The scene handles selection, legal moves, captures, and promotions.</li>
                <li>Use the in-board reset button for a fresh local match.</li>
                <li>Go back to the menu any time with the button below.</li>
              </ul>
            </div>

            <button
              onClick={() => setScreen("main-menu")}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all duration-200"
            >
              ← Back to Menu
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (activeScreen === "room-setup") {
    return (
      <CheckersRoomSetup
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen("main-menu")}
        joinError={room.joinError}
        isConnected={room.isConnected}
      />
    );
  }

  if (activeScreen === "room-lobby" && room.roomState) {
    return (
      <CheckersRoomLobby
        roomState={room.roomState}
        myClientId={room.myClientId}
        onStartGame={room.startGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if ((activeScreen === "room-lobby" || activeScreen === "room-game") && !room.roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-blue-300/30 border-t-blue-300 animate-spin" />
          <h2 className="text-2xl font-extrabold text-white">Preparing Room…</h2>
          <p className="text-blue-200/80 text-sm mt-2">
            Waiting for the latest room state from the Checkers server.
          </p>
        </div>
      </div>
    );
  }

  if (activeScreen === "room-game" && room.roomState) {
    return (
      <CheckersRoomGameView
        roomState={room.roomState}
        myClientId={room.myClientId}
        isHost={room.isHost}
        onSendMove={handleSendRoomMove}
        onReset={room.resetGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-xl mb-4">Something went wrong.</p>
        <button
          onClick={() => setScreen("main-menu")}
          className="px-6 py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
