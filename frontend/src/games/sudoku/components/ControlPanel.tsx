import type { GamePhase } from "../game/GameManager";
import type { Player } from "../game/Player";

interface Props {
  phase: GamePhase;
  currentPlayer: Player | null;
  selectedCell: { row: number; col: number } | null;
  onNumberInput: (num: number) => void;
  onNewPuzzle: () => void;
  onRestart: () => void;
}

export default function ControlPanel({
  phase,
  currentPlayer,
  selectedCell,
  onNumberInput,
  onNewPuzzle,
  onRestart,
}: Props) {
  const canInput = phase === "playing" && selectedCell !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Number pad */}
      {phase === "playing" && (
        <div className="bg-white rounded-2xl shadow border border-slate-100 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">
            {selectedCell
              ? `Enter number for (${selectedCell.row + 1}, ${selectedCell.col + 1})`
              : "Select a cell first"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                disabled={!canInput}
                onClick={() => onNumberInput(n)}
                className={`h-12 rounded-xl text-lg font-bold transition-all duration-150
                  ${
                    canInput
                      ? "text-white shadow-sm hover:scale-105 active:scale-95"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                style={
                  canInput && currentPlayer
                    ? {
                        backgroundColor: currentPlayer.color,
                        boxShadow: `0 2px 8px ${currentPlayer.color}44`,
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

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
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
            shadow-lg shadow-slate-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          ↩ Change Players
        </button>
      </div>

      {/* Keyboard hint */}
      {phase === "playing" && (
        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 text-center leading-relaxed">
          Click a cell, then press a key <strong>1–9</strong> or tap a number above
        </div>
      )}
    </div>
  );
}
