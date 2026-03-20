import type { Player } from "../game/Player";
import type { GamePhase } from "../game/GameManager";

interface Props {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: Player | null;
  lastMoveCorrect: boolean | null;
  moveCount: number;
}

export default function ScoreBoard({
  players,
  currentPlayerIndex,
  phase,
  winner,
  lastMoveCorrect,
  moveCount,
}: Props) {
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Current turn banner */}
      {phase === "playing" && currentPlayer && (
        <div
          className="rounded-2xl p-4 text-white font-bold text-center shadow-lg transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${currentPlayer.color}cc, ${currentPlayer.color}88)`,
            border: `2px solid ${currentPlayer.color}`,
          }}
        >
          <div className="text-xs uppercase tracking-widest opacity-80 mb-1">
            Current Turn
          </div>
          <div className="text-lg">{currentPlayer.name}</div>
          <div className="text-sm opacity-80">({currentPlayer.colorName})</div>
        </div>
      )}

      {/* Winner banner */}
      {phase === "finished" && winner && (
        <div className="rounded-2xl p-4 bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold text-center shadow-lg">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm uppercase tracking-widest opacity-80 mb-1">
            Winner!
          </div>
          <div className="text-lg">{winner.name}</div>
          <div className="text-sm opacity-80">
            {winner.score} point{winner.score !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Last move feedback */}
      {lastMoveCorrect !== null && phase === "playing" && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-semibold text-center transition-all duration-300 ${
            lastMoveCorrect
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {lastMoveCorrect ? "✓ Correct! +1 point" : "✕ Wrong number — 0 points"}
        </div>
      )}

      {/* Scoreboard */}
      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Scoreboard
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((player, rank) => {
              const isCurrentTurn =
                phase === "playing" && player.id === currentPlayer?.id;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    isCurrentTurn ? "bg-blue-50" : ""
                  }`}
                >
                  {/* Rank */}
                  <span className="text-xs font-bold text-slate-400 w-4">
                    #{rank + 1}
                  </span>
                  {/* Color dot */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                  />
                  {/* Name */}
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      isCurrentTurn ? "text-slate-800" : "text-slate-600"
                    }`}
                  >
                    {player.name}
                  </span>
                  {/* Score */}
                  <span
                    className="text-lg font-extrabold"
                    style={{ color: player.color }}
                  >
                    {player.score}
                  </span>
                  {/* Turn indicator */}
                  {isCurrentTurn && (
                    <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                      ▶ Turn
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Move counter */}
      <div className="text-center text-xs text-slate-400">
        Moves played: <span className="font-semibold text-slate-600">{moveCount}</span>
      </div>
    </div>
  );
}
