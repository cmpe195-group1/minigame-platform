// ─── RoomLobby ────────────────────────────────────────────────────────────────
// Waiting room: shows room code, connected players, start button (host only).

import { useState } from "react";
import type { RoomState } from "../room/RoomTypes";

interface Props {
  roomState: RoomState;
  myClientId: string | null;
  onStartGame: () => void;
  onLeave: () => void;
}

export default function RoomLobby({
  roomState,
  myClientId,
  onStartGame,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);

  const isHost = roomState.hostClientId === myClientId;
  const isFull = roomState.participants.length >= roomState.maxPlayers;
  const canStart = isHost && roomState.participants.length >= 2;

  // Transport badge
  const transportLabel =
    roomState.transport === "broadcast"
      ? { label: "Local (same browser)", icon: "🖥️", color: "text-blue-300 bg-blue-500/20" }
      : { label: "Online (WebSocket)", icon: "🌐", color: "text-green-300 bg-green-500/20" };

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🚪</div>
          <h2 className="text-2xl font-extrabold text-white">
            {isHost ? "Your Room" : "Joined Room"}
          </h2>
          <p className="text-blue-300 text-sm mt-1">
            {isHost ? "Waiting for players to join…" : "Waiting for host to start…"}
          </p>
          {/* Transport badge */}
          <span className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-3 py-1 rounded-full ${transportLabel.color}`}>
            {transportLabel.icon} {transportLabel.label}
          </span>
        </div>

        {/* Room Code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-center">
          <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-2">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-extrabold tracking-widest text-white">
              {roomState.roomCode}
            </span>
            <button
              onClick={copyCode}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/30 hover:bg-blue-500/50
                text-blue-200 hover:text-white transition-all font-semibold"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-blue-300/60 mt-3">
            {roomState.transport === "broadcast"
              ? "Share this code — other tabs in this browser can join"
              : "Share this code — players can join from any device"}
          </p>
        </div>

        {/* Players list */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">
              Players ({roomState.participants.length}/{roomState.maxPlayers})
            </p>
            {isFull && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">
                Room Full
              </span>
            )}
          </div>

          <div className="space-y-2">
            {roomState.participants.map((p) => (
              <div
                key={p.clientId}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 font-semibold text-sm">{p.name}</span>
                {p.clientId === roomState.hostClientId && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold">
                    Host
                  </span>
                )}
                {p.clientId === myClientId && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                    You
                  </span>
                )}
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
            ))}

            {/* Empty seats */}
            {Array.from(
              { length: roomState.maxPlayers - roomState.participants.length },
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 border-dashed
                    rounded-xl px-4 py-3 opacity-50"
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                  <span className="flex-1 text-sm text-white/40 italic">
                    Waiting for player…
                  </span>
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                </div>
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500
                hover:from-green-500 hover:to-emerald-400 rounded-2xl text-white text-lg font-bold
                shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-[1.02]
                active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                disabled:hover:scale-100"
            >
              {canStart ? "▶ Start Game" : "Need at least 2 players"}
            </button>
          )}

          {!isHost && (
            <div className="flex items-center justify-center gap-2 py-4 text-blue-300">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Waiting for host to start…</span>
            </div>
          )}

          <button
            onClick={onLeave}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10
              rounded-2xl text-white/70 hover:text-white text-sm font-semibold
              transition-all duration-200"
          >
            ← Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
