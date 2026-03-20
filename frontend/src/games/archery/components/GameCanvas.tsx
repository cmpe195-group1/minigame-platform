/**
 * GameCanvas.tsx
 * Multiplayer-aware Phaser game wrapper.
 *
 * - Each device only controls THEIR OWN archer (currentSlot === mySlot)
 * - Arrow results are sent via WebSocket → server broadcasts → all devices update
 * - Remote shots are animated on all screens
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserGame, type PhaserCallbacks } from '../phaser/PhaserGame';
import type { RoomSnapshot } from '../network/useGameSocket';
import { LiveScoreBoard } from './ScoreBoard';

interface Props {
  room           : RoomSnapshot;
  mySlot         : number;
  onArrowShot    : (score: number, dist: number) => void;
}

const GameCanvas: React.FC<Props> = ({ room, mySlot, onArrowShot }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);
  const roomRef      = useRef<RoomSnapshot>(room);

  // Keep room ref fresh for Phaser callbacks
  roomRef.current = room;

  const isMyTurn = room.currentSlot === mySlot && room.state === 'playing';

  // ── Bootstrap Phaser ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const callbacks: PhaserCallbacks = {
      onArrowLanded: (score: number, dist: number) => {
        // Only emit if it's this device's turn
        if (roomRef.current.currentSlot === mySlot) {
          onArrowShot(score, dist);
        }
      },
    };

    gameRef.current = createPhaserGame(
      containerRef.current,
      {
        mySlot,
        room: roomRef.current,
      },
      callbacks,
    );

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Forward room updates to Phaser via registry ──────────────────────────────
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('room', room);
    gameRef.current.registry.set('mySlot', mySlot);
    gameRef.current.registry.events.emit('roomUpdated', room);
  }, [room, mySlot]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-start relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse direction-alternate" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Top HUD bar */}
      <div className="w-full bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            🏹
          </div>
          <div>
            <h1 className="text-white font-black text-xl leading-none font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-1">Archery Duel</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Room: <span className="text-amber-400 font-black tracking-widest ml-1">{room.id}</span>
            </p>
          </div>
        </div>

        {/* Round pill */}
        <div className="flex items-center gap-3">
          <div className="bg-black/40 border border-white/10 rounded-full px-5 py-2 shadow-inner">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mr-2">Round</span>
            <span className="text-white font-black text-base">{room.currentRound}</span>
            <span className="text-slate-500 text-xs font-bold"> <span className="text-white/20">/</span> {room.totalRounds}</span>
          </div>
        </div>

        {/* Turn indicator */}
        <div className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full border shadow-lg font-bold text-sm transition-all duration-300 ${
          isMyTurn
            ? 'glass-panel border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
            : 'bg-black/30 border-white/10 text-slate-400'
        }`}>
          {isMyTurn && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1"></span>}
          {isMyTurn ? 'Your Turn to Shoot!' : `Waiting for ${room.players[room.currentSlot]?.name}...`}
        </div>
      </div>

      {/* Main content: canvas + scoreboard */}
      <div className="flex-1 flex gap-6 w-full max-w-[1400px] mx-auto p-6 relative z-10 h-[calc(100vh-140px)]">
        {/* Phaser Canvas */}
        <div className="flex-1 flex items-center justify-center relative">
          <div
            className="rounded-[2.5rem] overflow-hidden border transition-all duration-500 relative"
            style={{ 
              borderColor: isMyTurn ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)',
              boxShadow: isMyTurn ? '0 0 50px rgba(251,191,36,0.15), inset 0 0 20px rgba(251,191,36,0.05)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {isMyTurn && <div className="absolute inset-0 border-2 border-amber-500/20 rounded-[2.5rem] animate-pulse pointer-events-none" />}
            <div ref={containerRef} className="bg-slate-900 rounded-[2.5rem]" />
          </div>
        </div>

        {/* Scoreboard sidebar */}
        <div className="w-[340px] flex-shrink-0 h-full">
          <LiveScoreBoard
            room={room}
            mySlot={mySlot}
          />
        </div>
      </div>

      {/* Bottom hint bar */}
      <div className="w-full bg-white/5 backdrop-blur-xl border-t border-white/10 px-6 py-3 relative z-10">
        <div className="max-w-[1400px] mx-auto text-center">
          {isMyTurn ? (
            <p className="inline-flex items-center gap-3 text-amber-400 text-sm font-bold uppercase tracking-wider">
              <span className="text-xl animate-bounce">🏹</span> 
              <span>Click &amp; drag near your archer <span className="text-white/30 mx-2">→</span> release to shoot</span>
            </p>
          ) : (
            <p className="inline-flex items-center gap-3 text-slate-400 text-sm font-medium tracking-wide">
              <span className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-white animate-spin"></span>
              <span>Watching <span className="text-white font-bold">{room.players[room.currentSlot]?.name}</span>'s turn directly...</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
