import KnockoutGameWrapper from "../KnockoutGameWrapper";
import type { KnockoutStatus } from "../types";

interface Props {
  localStatus: KnockoutStatus;
  onStatusChange: (status: KnockoutStatus) => void;
  onBack: () => void;
}

export default function KnockoutLocalGameView({
  localStatus,
  onStatusChange,
  onBack,
}: Props) {
  const statusLabel = localStatus.winner
    ? `Player ${localStatus.winner} wins`
    : localStatus.phase === "waiting"
      ? `Player ${localStatus.currentPlayer} shot is resolving...`
      : `Player ${localStatus.currentPlayer} to shoot`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <header className="py-4 px-6 text-center flex-shrink-0">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">
          🥌 Knockout Local Match
        </h1>
        <p className="text-blue-300 text-sm mt-1">{statusLabel}</p>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 px-4 pb-8">
        <div className="flex-shrink-0">
          <KnockoutGameWrapper onStatusChange={onStatusChange} />
        </div>

        <div className="w-full max-w-xs xl:max-w-sm flex flex-col gap-4">
          <div
            className={`rounded-2xl p-4 border text-sm ${
              localStatus.winner
                ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                : "bg-white/5 border-white/10 text-slate-300"
            }`}
          >
            <div className="font-bold mb-1">{statusLabel}</div>
            <div className="text-xs opacity-90">
              Player A remaining: {localStatus.aRemaining} · Player B remaining: {localStatus.bRemaining}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-white">
            <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-3">
              Match Notes
            </p>
            <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
              <li>Drag back from one of your pucks, then release to shoot.</li>
              <li>Pucks that leave the board are eliminated and score immediately updates.</li>
              <li>Turns switch only after all pucks stop moving.</li>
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