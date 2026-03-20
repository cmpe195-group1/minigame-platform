import { useState, useRef, useCallback, useEffect } from "react";

// Local game imports
import PlayerSetup from "../games/sudoku/components/PlayerSetup";
import GameCanvas from "../games/sudoku/components/GameCanvas";
import ScoreBoard from "../games/sudoku/components/ScoreBoard";
import ControlPanel from "../games/sudoku/components/ControlPanel";
import SudokuScene from "../games/sudoku/phaser/SudokuScene";
import {
  type GameState,
  createInitialState,
  applyMove,
  newPuzzle,
  restartGame,
} from "../games/sudoku/game/GameManager";
import type { Board } from "../games/sudoku/game/SudokuBoard";

// Room game imports
import MainMenu from "../games/sudoku/components/MainMenu";
import RoomSetup from "../games/sudoku/components/RoomSetup";
import RoomLobby from "../games/sudoku/components/RoomLobby";
import RoomGameView from "../games/sudoku/components/RoomGameView";
import { useRoomGame } from "../games/sudoku/room/useRoomGame";

type AppScreen =
  | "main-menu"
  | "local-setup"
  | "local-game"
  | "room-setup"
  | "room-lobby"
  | "room-game";

export default function SudokuPage() {
  const [screen, setScreen] = useState<AppScreen>("main-menu");

  // ── LOCAL GAME STATE ───────────────────────────────────────────────────────
  const [localGameState, setLocalGameState] = useState<GameState>({
    phase: "setup",
    players: [],
    currentPlayerIndex: 0,
    board: [] as unknown as Board,
    winner: null,
    lastMoveCorrect: null,
    moveCount: 0,
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const localStateRef = useRef(localGameState);
  useEffect(() => { localStateRef.current = localGameState; }, [localGameState]);
  const sceneRef = useRef<SudokuScene | null>(null);

  // ── ROOM GAME STATE ────────────────────────────────────────────────────────
  const room = useRoomGame();

  // Sync room screen based on room status
  useEffect(() => {
    if (room.role === "none") return;
    const rs = room.roomState;
    if (!rs) return;
    if (rs.status === "waiting") setScreen("room-lobby");
    else if (rs.status === "playing" || rs.status === "finished") setScreen("room-game");
  }, [room.role, room.roomState?.status]);

  // ── LOCAL GAME HANDLERS ────────────────────────────────────────────────────
  const handleLocalStart = useCallback((playerCount: number) => {
    const state = createInitialState(playerCount);
    setLocalGameState(state);
    setSelectedCell(null);
    setScreen("local-game");
  }, []);

  const handleLocalCellClick = useCallback((row: number, col: number) => {
    const current = localStateRef.current;
    if (current.phase !== "playing") return;
    const cell = current.board?.[row]?.[col];
    if (cell && !cell.isGiven && cell.value === 0) {
      setSelectedCell({ row, col });
    } else {
      setSelectedCell(null);
      sceneRef.current?.clearSelection();
    }
  }, []);

  const handleLocalNumberInput = useCallback((num: number) => {
    const current = localStateRef.current;
    if (current.phase !== "playing") return;
    setSelectedCell((cell) => {
      if (!cell) return null;
      const { row, col } = cell;
      const boardCell = current.board?.[row]?.[col];
      if (!boardCell || boardCell.isGiven || boardCell.value !== 0) return null;
      const { newState } = applyMove(current, row, col, num);
      setLocalGameState(newState);
      sceneRef.current?.clearSelection();
      return null;
    });
  }, []);

  const handleLocalNewPuzzle = useCallback(() => {
    setLocalGameState((prev) => newPuzzle(prev));
    setSelectedCell(null);
    sceneRef.current?.clearSelection();
  }, []);

  const handleLocalRestart = useCallback(() => {
    setLocalGameState(restartGame());
    setSelectedCell(null);
    setScreen("main-menu");
  }, []);

  // Keyboard (local game)
  useEffect(() => {
    if (screen !== "local-game") return;
    const onKey = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) handleLocalNumberInput(num);
      if (e.key === "Escape") {
        setSelectedCell(null);
        sceneRef.current?.clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, handleLocalNumberInput]);

  // ── ROOM HANDLERS ──────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(
    (hostName: string, maxPlayers: number) => {
      room.createRoom(hostName, maxPlayers);
      setScreen("room-lobby");
    },
    [room]
  );

  const handleJoinRoom = useCallback(
    (code: string, name: string) => {
      room.joinRoom(code, name);
    },
    [room]
  );

  const handleLeaveRoom = useCallback(() => {
    room.leaveRoom();
    setScreen("main-menu");
  }, [room]);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (screen === "main-menu") {
    return (
      <MainMenu
        onSelectLocal={() => setScreen("local-setup")}
        onSelectRoom={() => setScreen("room-setup")}
      />
    );
  }

  if (screen === "local-setup") {
    return (
      <div>
        <button
          onClick={() => setScreen("main-menu")}
          className="fixed top-8 left-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
            text-white flex items-center justify-center text-lg transition-all backdrop-blur"
        >
          ←
        </button>
        <PlayerSetup onStart={handleLocalStart} />
      </div>
    );
  }

  if (screen === "local-game") {
    const { players, currentPlayerIndex, board, phase, winner, lastMoveCorrect, moveCount } =
      localGameState;
    const currentPlayer = players[currentPlayerIndex] ?? null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
        <header className="py-4 px-6 text-center flex-shrink-0">
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">
            🧩 Sudoku Multiplayer
          </h1>
          <p className="text-blue-300 text-sm mt-1">
            {phase === "finished"
              ? `🎉 Game Over! Winner: ${winner?.name ?? "Draw"}`
              : `${currentPlayer?.name}'s turn — press 1–9 to fill`}
          </p>
        </header>

        <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 px-4 pb-8">
          <div className="flex-shrink-0">
            {board && board.length > 0 && (
              <GameCanvas
                board={board}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                onCellClick={handleLocalCellClick}
                sceneRef={sceneRef}
              />
            )}
          </div>

          <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
            <ScoreBoard
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              phase={phase}
              winner={winner}
              lastMoveCorrect={lastMoveCorrect}
              moveCount={moveCount}
            />
            <ControlPanel
              phase={phase}
              currentPlayer={currentPlayer}
              selectedCell={selectedCell}
              onNumberInput={handleLocalNumberInput}
              onNewPuzzle={handleLocalNewPuzzle}
              onRestart={handleLocalRestart}
            />
          </div>
        </main>
      </div>
    );
  }

  if (screen === "room-setup") {
    return (
      <RoomSetup
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen("main-menu")}
        joinError={room.joinError}
        isConnected={room.isConnected}
        transport={room.transport}
      />
    );
  }

  if (screen === "room-lobby" && room.roomState) {
    return (
      <RoomLobby
        roomState={room.roomState}
        myClientId={room.myClientId}
        onStartGame={room.startGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if (screen === "room-game" && room.roomState) {
    return (
      <RoomGameView
        roomState={room.roomState}
        myClientId={room.myClientId}
        isHost={room.isHost}
        onMakeMove={room.makeMove}
        onNewPuzzle={room.handleNewPuzzle}
        onRestart={room.handleRestart}
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
