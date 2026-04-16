/**
 * Lobby.tsx
 * Multiplayer lobby — Create Room / Join Room / Waiting Room
 */

import React, { useState, useEffect } from 'react';
import type { RoomSnapshot } from '../network/useGameSocket';

interface LobbyProps {
  connected   : boolean;
  room        : RoomSnapshot | null;
  myId        : string;
  mySlot?     : number;
  error       : string | null;
  onCreate    : (name: string, maxPlayers: number) => void;
  onJoin      : (roomId: string, name: string) => void;
  onReady     : () => void;
  onHostStart : () => void;
  onClearError: () => void;
}

const SLOT_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#c084fc'];
const SLOT_EMOJIS = ['🔴', '🔵', '🟢', '🟣'];
const SLOT_LABELS = ['Archer 1', 'Archer 2', 'Archer 3', 'Archer 4'];

const Lobby: React.FC<LobbyProps> = ({
  connected, room, myId, error,
  onCreate, onJoin, onReady, onHostStart, onClearError,
}) => {
  const [tab,        setTab]        = useState<'create' | 'join'>('create');
  const [name,       setName]       = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [copied,     setCopied]     = useState(false);
  const [dots,       setDots]       = useState('');

  // Animated dots while connecting
  useEffect(() => {
    if (connected) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [connected]);

  const isInRoom = !!room;
  const amHost   = room?.hostId === myId;
  const me       = room?.players.find(p => p.id === myId);
  const amReady  = me?.ready ?? false;

  const handleCreate = () => {
    if (!connected) return;
    onCreate(name.trim(), maxPlayers);
  };

  const handleJoin = () => {
    if (!connected || joinCode.length < 5) return;
    onJoin(joinCode.trim(), name.trim());
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  // ── Waiting room ──────────────────────────────────────────────────────────────
  if (isInRoom && room) {
    const canStart = amHost && room.players.length >= 2;
    const slots    = Array.from({ length: room.maxPlayers });

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        {/* Background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] animate-pulse direction-alternate" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 animate-float">
            <div className="text-6xl mb-3 drop-shadow-2xl">🏹</div>
            <h1 className="text-4xl font-black tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Archery Duel
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide uppercase">Waiting Room</p>
          </div>

          {/* Room code card */}
          <div className="glass-panel rounded-3xl p-6 mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Room Code</span>
              <button
                onClick={() => handleCopy(room.id)}
                className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/5"
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="text-center relative z-10">
              <button
                onClick={() => handleCopy(room.id)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl px-10 py-4 hover:border-amber-500/40 hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.1)] group-hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
              >
                <span className="text-5xl font-black text-amber-400 tracking-[0.3em] font-display">{room.id}</span>
              </button>
              <p className="text-slate-500 text-xs mt-3 font-medium">Share this code with other players on their devices</p>
            </div>
          </div>

          {/* Player slots */}
          <div className="glass-panel rounded-3xl p-6 mb-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Players</span>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-slate-300 text-xs font-semibold">{room.players.length} / {room.maxPlayers}</span>
              </div>
            </div>
            <div className="space-y-3">
              {slots.map((_, i) => {
                const p    = room.players[i];
                const isMe = p?.id === myId;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-2xl p-3.5 border transition-all duration-300 ${
                      p
                        ? isMe
                          ? 'bg-gradient-to-r from-white/10 to-white/5 border-white/20 shadow-lg scale-[1.01]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'border-dashed border-white/10 bg-transparent'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-inner"
                      style={{
                        backgroundColor: p ? SLOT_COLORS[i] + '20' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${p ? SLOT_COLORS[i] + '50' : 'rgba(255,255,255,0.05)'}`,
                        boxShadow: p ? `inset 0 0 10px ${SLOT_COLORS[i]}20, 0 0 15px ${SLOT_COLORS[i]}10` : 'none'
                      }}
                    >
                      {p ? SLOT_EMOJIS[i] : <span className="text-white/20 text-sm font-bold">?</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {p ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm truncate tracking-wide">{p.name}</span>
                          {isMe && (
                            <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">You</span>
                          )}
                          {room.hostId === p.id && (
                            <span className="text-[9px] bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Host</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/25 text-sm italic font-medium">{SLOT_LABELS[i]} — Waiting…</span>
                      )}
                    </div>
                    {p && (
                      <div className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold flex-shrink-0 border transition-all ${
                        p.ready 
                          ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(72,211,153,0.2)]' 
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}>
                        {p.ready ? '✓ Ready' : 'Waiting'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-2xl px-4 py-3">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-300 text-sm flex-1">{error}</span>
              <button onClick={onClearError} className="text-red-400 hover:text-red-200 text-lg">✕</button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 mt-6">
            {!amReady ? (
              <button
                onClick={onReady}
                className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  ✓ I'm Ready!
                </span>
              </button>
            ) : (
              <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center rounded-2xl text-sm flex items-center justify-center gap-2">
                ✓ You are ready <span className="text-emerald-500/50">—</span> waiting for others<span className="animate-pulse">...</span>
              </div>
            )}

            {amHost && (
              <button
                onClick={onHostStart}
                disabled={!canStart}
                className={`w-full py-4.5 font-black text-lg rounded-2xl transition-all active:scale-95 relative overflow-hidden group ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-400/50'
                    : 'bg-white/5 text-white/25 cursor-not-allowed border border-white/10'
                }`}
              >
                {canStart && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {canStart ? '🏹 Start Game Now' : `Need at least 2 players (${room.players.length}/${room.maxPlayers})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-room screen (Create / Join) ────────────────────────────────────────────

  const isConnecting = !connected && !error;
  const isServerDown = !connected && !!error && error.toLowerCase().includes('backend');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse direction-alternate" style={{ animationDelay: '1.5s' }} />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 animate-float">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-3xl mb-5 text-5xl shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-md relative">
            <div className="absolute inset-0 bg-white/5 rounded-3xl opacity-0 hover:opacity-100 transition-opacity"></div>
            🏹
          </div>
          <h1 className="text-6xl font-black text-white tracking-tight font-display mb-2 drop-shadow-lg">Archery</h1>
          <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-wide font-display">Multiplayer</p>
          <div className="flex items-center justify-center gap-3 mt-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <span>Real-time</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>2–4 Players</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>Online</span>
          </div>
        </div>

        {/* Connection status banner */}
        {isConnecting && (
          <div className="mb-5 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-2xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">Connecting to server{dots}</span>
          </div>
        )}

        {connected && (
          <div className="mb-5 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/25 rounded-2xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-sm font-medium">Connected — server is ready</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-5 bg-red-500/15 border border-red-500/35 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="text-red-300 text-sm font-semibold">{error}</p>
                {isServerDown && (
                  <div className="mt-3 text-xs text-red-400/80 space-y-1 bg-black/20 rounded-xl p-3 font-mono">
                    <p className="font-sans text-slate-400 font-bold mb-2">How to start the backend:</p>
                    <p className="text-green-400">$ .\\gradlew.bat bootRun</p>
                    <p className="text-slate-500 mt-1 font-sans text-[11px]">
                      Run it from the repo root so the STOMP endpoint is available at <span className="text-green-400">/ws</span>
                    </p>
                  </div>
                )}
              </div>
              <button onClick={onClearError} className="text-red-400 hover:text-red-200 text-lg flex-shrink-0">✕</button>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex glass-panel rounded-2xl p-1.5 mb-6 relative z-20 shadow-xl">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 relative overflow-hidden ${
                tab === t
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === t && <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-100 transition-opacity"></div>}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t === 'create' ? <><span className="text-lg">🏕️</span> Create Room</> : <><span className="text-lg">🔗</span> Join Room</>}
              </span>
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="glass-panel rounded-[2rem] p-7 space-y-6 shadow-2xl relative z-10">
          {/* Player name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Your Archer Name (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                👤
              </div>
              <input
                type="text"
                maxLength={16}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
                placeholder="Enter your name or leave blank..."
                className="w-full bg-black/20 border border-white/10 text-white placeholder-slate-600 rounded-2xl pl-11 pr-4 py-4 font-semibold focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {tab === 'create' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Max Players
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`py-3.5 rounded-2xl font-bold text-sm transition-all border ${
                        maxPlayers === n
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {n}
                      <span className="block text-[10px] opacity-70 font-normal mt-0.5 uppercase tracking-wider">Players</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!connected}
                className={`w-full py-4.5 font-black text-lg rounded-2xl transition-all active:scale-95 relative overflow-hidden group ${
                  connected
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-400/50'
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                }`}
              >
                {connected && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {!connected ? `Connecting${dots}` : '🏕️ Create Room'}
                </span>
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Room Code (5 characters)
                </label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    🔑
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="XXXXX"
                    className="w-full bg-black/20 border border-white/10 text-white placeholder-slate-600/50 rounded-2xl pl-11 pr-4 py-4 font-black text-2xl text-center tracking-[0.4em] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all uppercase shadow-inner block"
                    style={{ textIndent: '-1.5rem' }} 
                  />
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={!connected || joinCode.length < 5}
                className={`w-full py-4.5 font-black text-lg rounded-2xl transition-all active:scale-95 relative overflow-hidden group ${
                  connected && joinCode.length >= 5
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/50'
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                }`}
              >
                {connected && joinCode.length >= 5 && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {!connected ? `Connecting${dots}` : '🔗 Join Room'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* How-to play */}
        <div className="mt-5 bg-white/3 border border-white/8 rounded-2xl p-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">How to Play</p>
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex gap-2"><span className="text-amber-400 flex-shrink-0">1.</span><span>Player 1 creates a room and shares the <span className="text-white">room code</span></span></div>
            <div className="flex gap-2"><span className="text-amber-400 flex-shrink-0">2.</span><span>Other players join with the code on their own device</span></div>
            <div className="flex gap-2"><span className="text-amber-400 flex-shrink-0">3.</span><span>Click Ready or host presses Start</span></div>
            <div className="flex gap-2"><span className="text-amber-400 flex-shrink-0">4.</span><span>Take turns: <span className="text-white">drag &amp; release</span> to shoot arrows at the target</span></div>
            <div className="flex gap-2"><span className="text-amber-400 flex-shrink-0">5.</span><span>3 arrows per player per round · 3 rounds total · highest score wins!</span></div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: '🎯', title: '3 Arrows', sub: 'per round' },
            { icon: '🏅', title: '3 Rounds', sub: 'total' },
            { icon: '🌬️', title: 'Wind', sub: 'physics' },
          ].map(f => (
            <div key={f.title} className="glass-panel border-white/5 rounded-2xl p-4 text-center hover:bg-white/5 transition-colors cursor-default">
              <div className="text-2xl mb-2 drop-shadow-md">{f.icon}</div>
              <div className="text-white text-xs font-bold tracking-wide">{f.title}</div>
              <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
