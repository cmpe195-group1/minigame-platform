import { useState } from "react";
import { PLAYER_COLORS } from "../game/Player";

interface Props {
  onStart: (playerCount: number) => void;
}

export default function PlayerSetup({ onStart }: Props) {
  const [count, setCount] = useState(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-10 w-full max-w-md text-white text-center">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow mb-2">
            🧩 Sudoku Multiplayer
          </h1>
          <p className="text-blue-200 text-sm">
            Turn-based local multiplayer — same device
          </p>
        </div>

        {/* Player count selector */}
        <div className="mb-8">
          <p className="text-lg font-semibold mb-4 text-blue-100">
            Select number of players
          </p>
          <div className="flex justify-center gap-4">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                data-testid={`sudoku-player-count-${n}`}
                className={`w-16 h-16 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-lg
                  ${
                    count === n
                      ? "bg-blue-500 text-white scale-110 ring-4 ring-blue-300/50 shadow-blue-500/40"
                      : "bg-white/10 text-blue-200 hover:bg-white/20 hover:scale-105"
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player color preview */}
        <div className="mb-8">
          <p className="text-sm text-blue-200 mb-3 font-medium uppercase tracking-widest">
            Players
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[i].color }}
                />
                <span className="text-sm font-semibold">
                  Player {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(count)}
          data-testid="sudoku-start-local-game"
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
            rounded-2xl text-white text-xl font-bold shadow-xl shadow-blue-500/30
            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Game →
        </button>

        {/* Rules footer */}
        <div className="mt-6 text-xs text-blue-300/70 leading-relaxed">
          ✓ Correct number = +1 point &nbsp;|&nbsp; ✕ Wrong number = 0 points
          <br />
          Highest score when board is full wins!
        </div>
      </div>
    </div>
  );
}
