import { useState } from "react";
//refactor to useStompRoomTransport instead of useWebSocketRoomTransport, for all games instaed of just checkers
import type { BaseRoomState } from "../transport/types";

interface Props<TGameState> {
  roomState: BaseRoomState<TGameState>,
  myClientId: string | null;
  onStartGame: () => void;
  onLeave: () => void;
}

export default function RoomLobby<TGameState>({
  roomState,
  myClientId,   
  onStartGame,
    onLeave,
}: Props<TGameState>) {
  const [copied, setCopied] = useState(false);
  const isHost = roomState.hostClientId === myClientId;
  const canStart = isHost && roomState.participants.length >= 2;
    const handleCopyCode = async () => {
        try {      
            await navigator.clipboard.writeText(roomState.roomCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };
    
    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">
        <div className="text-center mb-6">
            <div className="text-3xl mb-2">🚪</div>
            <h2 className="text-2xl font-extrabold text-white">
                {isHost ? "Your Room" : "Joined Room"}
            </h2>
            <p className="text-blue-300 text-sm mt-1">
                {isHost ? "Waiting for players to join…" : "Waiting for the host to start the match…"}
            </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-center">
            <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-2">
                Room Code
            </p>
            <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-extrabold tracking-widest text-white">
                    {roomState.roomCode}
                </span>
                <button
                    onClick={handleCopyCode}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 hover:text-white transition-all font-semibold"
                >
                    {copied ? "✓ Copied" : "Copy"}
                </button>
            </div>
            <p className="text-xs text-blue-300/60 mt-3">Share the code so other players can join.</p>
        </div>
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">
                    Players ({roomState.participants.length}/{roomState.maxPlayers})
                </p>
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">
                    WebSocket room
                </span>
            </div>
            <div className="space-y-2">
                {roomState.participants.map((participant) => {
                    return (
                        <div
                            key={participant.clientId}
                            className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
                        >
                            <span className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{participant.name}</div>
                            </div>
                            {participant.clientId === roomState.hostClientId && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold">
                                    Host
                                </span>
                            )}  
                            {participant.clientId === myClientId && (
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                                    You
                                </span>
                            )}
                        </div>
                    );
                }
                )}
                {roomState.participants.length < roomState.maxPlayers && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 border-dashed rounded-xl px-4 py-3 opacity-60">   
                        <span className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                        <span className="flex-1 text-sm text-white/50 italic">Waiting for more players…</span>
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col gap-3">
            {isHost ? (
                <button
                    onClick={onStartGame}
                    disabled={!canStart}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {canStart ? "▶ Start Match" : "Need at least 2 players to start"}
                </button>
            ) : (
                <div className="flex items-center justify-center gap-2 py-4 text-blue-300">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Waiting for host to start…</span>
                </div>
            )}
            <button
                onClick={onLeave}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/70 hover:text-white text-sm font-semibold transition-all duration-200"
            >
                ← Leave Room
            </button>
        </div>
      </div>
    </div>
  );
}

        /*
import type { RoomState } from "../room/RoomTypes";
import type { Player } from "../types";

interface Props {
  roomState: RoomState;
  myClientId: string | null;
  onStartGame: () => void;
  onLeave: () => void;
}

const pieceTheme: Record<Player, { label: string; chipClass: string; dotClass: string }> = {
  white: {
    label: "White",
    chipClass: "bg-slate-100 text-slate-900",
    dotClass: "bg-white border border-slate-400",
  },
  black: {
    label: "Black",
    chipClass: "bg-slate-800 text-slate-100 border border-slate-600",
    dotClass: "bg-slate-900 border border-slate-500",
  },
};

export default function CheckersRoomLobby({
  roomState,
  myClientId,
  onStartGame,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = roomState.hostClientId === myClientId;
  const canStart = isHost && roomState.participants.length >= 2;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🚪</div>
          <h2 className="text-2xl font-extrabold text-white">
            {isHost ? "Your Checkers Room" : "Joined Checkers Room"}
          </h2>
          <p className="text-blue-300 text-sm mt-1">
            {isHost ? "Waiting for the second player to join…" : "Waiting for the host to start the match…"}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-center">
          <p className="text-xs text-blue-300 uppercase tracking-widest font-semibold mb-2">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-extrabold tracking-widest text-white">
              {roomState.roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 hover:text-white transition-all font-semibold"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-blue-300/60 mt-3">White moves first. Share the code so the second player can join.</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">
              Players ({roomState.participants.length}/{roomState.maxPlayers})
            </p>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">
              WebSocket room
            </span>
          </div>

          <div className="space-y-2">
            {roomState.participants.map((participant) => {
              const theme = pieceTheme[participant.pieceColor];
              return (
                <div
                  key={participant.clientId}
                  className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
                >
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${theme.dotClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{participant.name}</div>
                    <div className="text-xs text-blue-200/80 mt-0.5">{theme.label} pieces</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${theme.chipClass}`}>
                    {theme.label}
                  </span>
                  {participant.clientId === roomState.hostClientId && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold">
                      Host
                    </span>
                  )}
                  {participant.clientId === myClientId && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                      You
                    </span>
                  )}
                </div>
              );
            })}

            {roomState.participants.length < 2 && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 border-dashed rounded-xl px-4 py-3 opacity-60">
                <span className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                <span className="flex-1 text-sm text-white/50 italic">Waiting for player two…</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {canStart ? "▶ Start Match" : "Need 2 players to start"}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 text-blue-300">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Waiting for host to start…</span>
            </div>
          )}

          <button
            onClick={onLeave}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/70 hover:text-white text-sm font-semibold transition-all duration-200"
          >
            ← Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
*/