/**
 * PlayerSetup.tsx
 * First screen – lets players choose how many players and enter names.
 */

import React, { useState } from 'react';
import { PLAYER_COLORS, DEFAULT_NAMES } from '../game/Player';

interface Props {
  onStart: (playerCount: number, playerNames: string[]) => void;
}

const PlayerSetup: React.FC<Props> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>([...DEFAULT_NAMES]);

  const handleNameChange = (idx: number, value: string) => {
    setNames(prev => {
      const next = [...prev];
      next[idx] = value || DEFAULT_NAMES[idx];
      return next;
    });
  };

  const handleStart = () => {
    onStart(playerCount, names.slice(0, playerCount));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-green-500 flex items-center justify-center p-4">
      {/* Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/60">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏹</div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Archery</h1>
          <p className="text-lg text-gray-500 font-medium mt-1">Local Multiplayer · 3 Rounds</p>
        </div>

        {/* Player Count Selector */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
            Number of Players
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`py-3 rounded-xl font-bold text-lg transition-all duration-200 border-2 ${
                  playerCount === n
                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                {n} Players
              </button>
            ))}
          </div>
        </div>

        {/* Player Name Inputs */}
        <div className="mb-8 space-y-3">
          <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider mb-1">
            Player Names
          </label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* Color dot */}
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white shadow"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
              />
              <input
                type="text"
                maxLength={16}
                defaultValue={DEFAULT_NAMES[i]}
                onChange={e => handleNameChange(i, e.target.value)}
                placeholder={DEFAULT_NAMES[i]}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none text-gray-800 font-medium transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
        >
          🏹 Start Game
        </button>

        {/* Info strip */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🎯', label: '3 Arrows', sub: 'per turn' },
            { icon: '🏅', label: '3 Rounds', sub: 'total' },
            { icon: '⭐', label: '10 pts', sub: 'bullseye' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl">{icon}</div>
              <div className="text-xs font-bold text-gray-700 mt-1">{label}</div>
              <div className="text-xs text-gray-400">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSetup;
