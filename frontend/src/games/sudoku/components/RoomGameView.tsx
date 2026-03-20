// ─── RoomGameView ─────────────────────────────────────────────────────────────
// Game screen for Room mode.
import { useState, useRef, useCallback, useEffect } from "react";
import type { RoomState } from "../room/RoomTypes";
import type { Player } from "../game/Player";
import GameCanvas from "./GameCanvas";
import ScoreBoard from "./ScoreBoard";
import SudokuScene from "../phaser/SudokuScene";

interface Props {
  roomState: RoomState;
  myClientId: string | null;
  isHost: boolean;
  onMakeMove: (row: number, col: number, num: number) => void;
  onNewPuzzle: () => void;
  onRestart: () => void;
}

export default function RoomGameView({
  roomState,
  myClientId,
  isHost,
  onMakeMove,
  onNewPuzzle,
  onRestart,
}: Props) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const sceneRef = useRef<SudokuScene | null>(null);
  const roomStateRef = useRef(roomState);

  useEffect(() => {
    roomStateRef.current = roomState;
    setSelectedCell(null);
    sceneRef.current?.clearSelection();
  }, [roomState.currentPlayerIndex, roomState]);

  // Identify MY player using unified clientId
  const myParticipant = roomState.participants.find(
    (p) => p.clientId === myClientId
  );
  const myPlayer: Player | undefined = myParticipant
    ? roomState.players.find((p) => p.id === myParticipant.playerId)
    : undefined;

  const currentPlayer = roomState.players[roomState.currentPlayerIndex] ?? null;
  const isMyTurn = !!myPlayer && myPlayer.id === currentPlayer?.id;

  // ── Cell click ───────────────────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const current = roomStateRef.current;
      if (!isMyTurn || current.phase !== "playing") return;
      const cell = current.board?.[row]?.[col];
      if (cell && !cell.isGiven && cell.value === 0) {
        setSelectedCell({ row, col });
      } else {
        setSelectedCell(null);
        sceneRef.current?.clearSelection();
      }
    },
    [isMyTurn]
  );

  // ── Number input ─────────────────────────────────────────────────────────────
  const handleNumberInput = useCallback(
    (num: number) => {
      if (!isMyTurn) return;
      setSelectedCell((cell) => {
        if (!cell) return null;
        const current = roomStateRef.current;
        const boardCell = current.board?.[cell.row]?.[cell.col];
        if (!boardCell || boardCell.isGiven || boardCell.value !== 0) return null;
        onMakeMove(cell.row, cell.col, num);
        sceneRef.current?.clearSelection();
        return null;
      });
    },
    [isMyTurn, onMakeMove]
  );

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) handleNumberInput(num);
      if (e.key === "Escape") {
        setSelectedCell(null);
        sceneRef.current?.clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNumberInput]);

  const { board, players, currentPlayerIndex, phase, winner, lastMoveCorrect, moveCount } =
    roomState;

  const canInput = isMyTurn && phase === "playing" && selectedCell !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="py-3 px-6 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-white/10 text-blue-300 px-3 py-1 rounded-full font-mono font-bold">
            Room: {roomState.roomCode}
          </span>
          {/* Transport indicator */}
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
            roomState.transport === "broadcast"
              ? "bg-blue-500/20 text-blue-300"
              : "bg-green-500/20 text-green-300"
          }`}>
            {roomState.transport === "broadcast" ? "🖥️ Local" : "🌐 Online"}
          </span>
          {myPlayer && (
            <span
              className="text-xs px-3 py-1 rounded-full font-bold"
              style={{
                backgroundColor: `${myPlayer.color}33`,
                color: myPlayer.color,
                border: `1px solid ${myPlayer.color}66`,
              }}
            >
              You: {myPlayer.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">🧩 Sudoku</h1>

        <div className="text-right">
          {phase === "playing" && (
            <p className="text-blue-300 text-xs">
              {isMyTurn ? (
                <span className="text-green-400 font-bold animate-pulse">Your turn!</span>
              ) : (
                `${currentPlayer?.name}'s turn`
              )}
            </p>
          )}
          {phase === "finished" && (
            <p className="text-yellow-400 text-xs font-bold">🏆 {winner?.name} wins!</p>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 px-4 pb-8">
        {/* Canvas */}
        <div className="flex-shrink-0">
          {board && board.length > 0 && (
            <div
              className={`rounded-2xl transition-all duration-300 ${
                isMyTurn && phase === "playing" ? "ring-4 ring-green-400/50" : ""
              }`}
            >
              <GameCanvas
                board={board}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                onCellClick={handleCellClick}
                sceneRef={sceneRef}
              />
            </div>
          )}
          <p
            className={`text-center text-sm mt-2 font-semibold xl:hidden ${
              isMyTurn && phase === "playing" ? "text-green-400" : "text-slate-400"
            }`}
          >
            {isMyTurn && phase === "playing"
              ? "✅ Your turn — tap a cell"
              : phase === "playing"
              ? `⏳ ${currentPlayer?.name}'s turn`
              : ""}
          </p>
        </div>

        {/* Right panel */}
        <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
          {/* Turn indicator */}
          {phase === "playing" && (
            <div
              className={`rounded-2xl p-3 text-center font-bold text-sm transition-all duration-300 ${
                isMyTurn
                  ? "bg-green-500/20 border border-green-400/50 text-green-300"
                  : "bg-white/5 border border-white/10 text-slate-400"
              }`}
            >
              {isMyTurn
                ? "🎯 It's YOUR turn! Select a cell."
                : `⏳ Waiting for ${currentPlayer?.name}…`}
            </div>
          )}

          <ScoreBoard
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            phase={phase}
            winner={winner}
            lastMoveCorrect={lastMoveCorrect}
            moveCount={moveCount}
          />

          {/* Number pad */}
          {phase === "playing" && (
            <div className="bg-white rounded-2xl shadow border border-slate-100 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">
                {!isMyTurn
                  ? "Not your turn"
                  : selectedCell
                  ? `Cell (${selectedCell.row + 1}, ${selectedCell.col + 1}) — enter number`
                  : "Select a cell first"}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    disabled={!canInput}
                    onClick={() => handleNumberInput(n)}
                    className={`h-12 rounded-xl text-lg font-bold transition-all duration-150 ${
                      canInput
                        ? "text-white shadow-sm hover:scale-105 active:scale-95"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    }`}
                    style={
                      canInput && myPlayer
                        ? {
                            backgroundColor: myPlayer.color,
                            boxShadow: `0 2px 8px ${myPlayer.color}44`,
                          }
                        : {}
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col gap-2">
            {isHost ? (
              <>
                <button
                  onClick={onNewPuzzle}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold
                    shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  🔄 New Puzzle
                </button>
                <button
                  onClick={onRestart}
                  className="w-full py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold
                    shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ↩ Back to Lobby
                </button>
              </>
            ) : (
              <div className="text-center text-xs text-slate-400 bg-white/5 rounded-xl p-3">
                Only the host can start a new puzzle or restart.
              </div>
            )}
          </div>

          {/* Connected players list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-3">
              Connected Players
            </p>
            <div className="space-y-2">
              {roomState.participants.map((p) => (
                <div key={p.clientId} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="font-semibold" style={{ color: p.color }}>
                    {p.name}
                  </span>
                  {p.clientId === myClientId && (
                    <span className="text-white/40">(you)</span>
                  )}
                  {p.clientId === roomState.hostClientId && (
                    <span className="text-yellow-400/70">👑</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
