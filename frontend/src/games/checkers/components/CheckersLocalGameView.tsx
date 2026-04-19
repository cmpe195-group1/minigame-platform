import CheckersGameWrapper from "../CheckersGameWrapper";
import type { CheckersSceneStatusExtra } from "../checkersScene";
import type { Player } from "../types";

export interface LocalStatus {
  status: "playing" | "game_over";
  turn: Player;
  winner: Player | null;
  whitePieces: number;
  blackPieces: number;
}

export const defaultLocalStatus: LocalStatus = {
  status: "playing",
  turn: "white",
  winner: null,
  whitePieces: 12,
  blackPieces: 12,
};

interface Props {
  localStatus: LocalStatus;
  onStatusChange: (
    status: "playing" | "game_over",
    turn: Player,
    extra?: CheckersSceneStatusExtra
  ) => void;
  onBack: () => void;
}

export default function CheckersLocalGameView({
  localStatus,
  onStatusChange,
  onBack,
}: Props) {
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
          <CheckersGameWrapper onStatusChange={onStatusChange} />
        </div>

        <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
          <div
            data-testid="checkers-local-status"
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
            onClick={onBack}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all duration-200"
          >
            ← Back to Menu
          </button>
        </div>
      </main>
    </div>
  );
}