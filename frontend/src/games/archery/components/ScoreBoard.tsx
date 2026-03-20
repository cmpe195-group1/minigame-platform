/**
 * ScoreBoard.tsx
 * Multiplayer scoreboard using RoomSnapshot from the server.
 */

import React from 'react';
import type { RoomSnapshot } from '../network/useGameSocket';
import { ringColor, scoreLabel } from '../game/ScoreSystem';

// ─── Live ScoreBoard (sidebar during game) ────────────────────────────────────

interface LiveScoreBoardProps {
  room   : RoomSnapshot;
  mySlot : number;
}

export const LiveScoreBoard: React.FC<LiveScoreBoardProps> = ({ room, mySlot }) => {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* Round info */}
      <div className="glass-panel border-white/10 rounded-3xl p-4 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent opacity-50" />
        <p className="text-amber-500 text-[10px] uppercase tracking-[0.2em] font-black mb-1 relative z-10">Current Round</p>
        <p className="text-white font-black text-4xl leading-tight font-display drop-shadow-md relative z-10">
          {room.currentRound}
          <span className="text-slate-500 text-lg"> / {room.totalRounds}</span>
        </p>
        <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide relative z-10">
          Arrow <span className="text-amber-400 font-bold">{room.arrowsFired + 1}</span> / {room.arrowsPerRound}
        </p>
      </div>

      {/* Players */}
      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {room.players.map((player, i) => {
          const isActive = i === room.currentSlot;
          const isMe     = i === mySlot;

          return (
            <div
              key={player.id}
              className={`rounded-3xl p-4 border transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/30 scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                  : 'glass-panel border-white/5 hover:bg-white/5'
              }`}
              style={isActive ? { boxShadow: `0 0 20px ${player.color}40`, borderColor: `${player.color}60` } : {}}
            >
              {isActive && (
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50 animate-pulse" style={{ background: `linear-gradient(to right, transparent, ${player.color}, transparent)` }} />
              )}
              {/* Player header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner ring-2 ring-white/10"
                  style={{ backgroundColor: player.color }}
                />
                <span className={`text-base font-bold truncate flex-1 tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {player.name}
                </span>
                <div className="flex gap-1.5">
                  {isMe && (
                    <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      You
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[9px] bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(72,211,153,0.3)]">
                      Turn
                    </span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="flex items-baseline justify-between mb-3 bg-black/20 rounded-xl p-2 px-3 border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-display tracking-tight drop-shadow-md" style={{ color: isActive ? '#fff' : player.color }}>
                    {player.total}
                  </span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">pts</span>
                </div>
              </div>

              {/* Arrow dots */}
              <div className="flex gap-2">
                {player.scores.map((arrow, ai) => (
                  <div
                    key={ai}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ring-1 ring-white/20 transform transition-transform hover:scale-110"
                    style={{ backgroundColor: ringColor(arrow.score) }}
                    title={`Arrow ${ai + 1}: ${scoreLabel(arrow.score)} (${arrow.score}pts)`}
                  >
                    {arrow.score}
                  </div>
                ))}
                {/* Empty slots placeholders */}
                {Array.from({ length: Math.max(0, room.arrowsPerRound - player.scores.length) }).map((_, ai) => (
                  <div
                    key={`empty-${ai}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-dashed border-white/20 bg-black/20 text-white/10 text-[10px] font-bold"
                  >
                    -
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scoring guide */}
      <div className="glass-panel border-white/10 rounded-3xl p-4">
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Scoring Guide</p>
        <div className="space-y-2">
          {[
            { score: 10, label: 'Bullseye', color: '#FFD700' },
            { score: 8,  label: 'Inner Red', color: '#e74c3c' },
            { score: 6,  label: 'Red',       color: '#c0392b' },
            { score: 4,  label: 'Blue',      color: '#3498db' },
            { score: 2,  label: 'Black',     color: '#2c3e50' },
          ].map(({ score, label, color }) => (
            <div key={score} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner ring-1 ring-white/20" style={{ backgroundColor: color }} />
              <span className="text-slate-400 text-xs flex-1 font-medium">{label}</span>
              <span className="text-white text-xs font-black bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{score} <span className="text-[9px] text-slate-500 uppercase">pts</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Final Results screen ─────────────────────────────────────────────────────

interface FinalResultsProps {
  room     : RoomSnapshot;
  mySlot   : number;
  onRestart: () => void;
}

export const FinalResults: React.FC<FinalResultsProps> = ({ room, mySlot, onRestart }) => {
  const ranked  = [...room.players].sort((a, b) => b.total - a.total);
  const winner  = ranked[0];
  const medals  = ['🥇', '🥈', '🥉', '4️⃣'];

  const podiumGrad = [
    'from-yellow-500/30 to-amber-600/20 border-yellow-500/40',
    'from-slate-400/20 to-slate-500/10 border-slate-400/30',
    'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    'from-slate-600/20 to-slate-700/10 border-slate-600/20',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[150px] animate-pulse" />
      </div>

      {/* Confetti bg effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm opacity-60 animate-bounce"
            style={{
              left     : `${Math.random() * 100}%`,
              top      : `${Math.random() * 100}%`,
              width    : `${Math.random() * 6 + 4}px`,
              height   : `${Math.random() * 6 + 4}px`,
              backgroundColor: ['#FFD700','#e74c3c','#3498db','#2ecc71', '#c084fc'][i % 5],
              animationDelay  : `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Winner banner */}
        <div className="text-center mb-10 animate-float">
          <div className="text-8xl mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)] transform hover:scale-110 transition-transform cursor-default">🏆</div>
          <h1 className="text-5xl font-black tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 drop-shadow-lg mb-4">
            Game Over!
          </h1>
          <div className="mt-4 inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-8 py-3 shadow-[0_0_20px_rgba(251,191,36,0.15)] backdrop-blur-md">
            <div className="w-4 h-4 rounded-full shadow-inner ring-2 ring-white/20" style={{ backgroundColor: winner.color }} />
            <span className="text-yellow-400 font-black text-2xl tracking-wide font-display">{winner.name} Wins! 🎉</span>
          </div>
          {ranked[0]?.id === room.players[mySlot]?.id && (
            <div className="mt-4">
               <span className="inline-block px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 font-bold text-sm tracking-widest uppercase animate-pulse shadow-[0_0_15px_rgba(72,211,153,0.3)]">
                 🎯 You won!
               </span>
            </div>
          )}
        </div>

        {/* Podium cards */}
        <div className="space-y-4 mb-10">
          {ranked.map((player, rank) => {
            const isMe = player.id === room.players[mySlot]?.id;
            return (
              <div
                key={player.id}
                className={`rounded-[2rem] p-5 bg-gradient-to-r ${podiumGrad[rank]} border backdrop-blur-md relative overflow-hidden group ${
                  rank === 0 ? 'scale-[1.03] shadow-[0_0_30px_rgba(251,191,36,0.15)] z-10' : 'shadow-lg'
                } ${isMe ? 'ring-2 ring-white/40' : ''}`}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="text-4xl drop-shadow-md w-12 text-center">{medals[rank]}</div>
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 shadow-inner ring-2 ring-white/30"
                    style={{ backgroundColor: player.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-black text-white text-lg truncate tracking-wide font-display">{player.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0 uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    {/* Arrow score dots */}
                    <div className="flex gap-1.5 flex-wrap">
                      {player.scores.map((arrow, ai) => (
                        <div
                          key={ai}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow ring-1 ring-white/20"
                          style={{ backgroundColor: ringColor(arrow.score) }}
                        >
                          {arrow.score}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 bg-black/20 rounded-2xl px-4 py-2 border border-white/10">
                    <div className="text-4xl font-black text-white font-display drop-shadow-md">{player.total}</div>
                    <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xl rounded-[2rem] shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 relative overflow-hidden group"
        >
           <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
           <span className="relative z-10 flex items-center justify-center gap-3">
             <span className="text-2xl">🏹</span> Play Again
           </span>
        </button>
      </div>
    </div>
  );
};
