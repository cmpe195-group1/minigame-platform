// ─── RoomSetup ────────────────────────────────────────────────────────────────
// Screen to create or join a room.
import { useState } from "react";
import { PLAYER_COLORS } from "../game/Player";
import type { RoomTransport } from "../room/RoomTypes";

interface Props {
  onCreateRoom: (hostName: string, maxPlayers: number) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onBack: () => void;
  joinError?: string | null;
  isConnected?: boolean;
  transport?: RoomTransport;
}

export default function RoomSetup({
  onCreateRoom,
  onJoinRoom,
  onBack,
  joinError,
  isConnected = true,
  transport = "websocket",
}: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [hostName, setHostName] = useState("Player 1");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Player 2");

  const isLocal = transport === "broadcast";

  const handleCreate = () => {
    const name = hostName.trim() || "Player 1";
    onCreateRoom(name, maxPlayers);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim() || "Player";
    if (!code || code.length < 4) return;
    onJoinRoom(code, name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-sm"
          >
            ←
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Room Mode</h2>
            {/* Transport + connection status */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isLocal ? (
                <span className="flex items-center gap-1 text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                  🖥️ Local · BroadcastChannel
                </span>
              ) : (
                <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isConnected
                    ? "text-green-300 bg-green-500/20"
                    : "text-red-300 bg-red-500/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                  🌐 Online · {isConnected ? "Server connected" : "Connecting…"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-white/20 mb-6">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                tab === t
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-blue-300 hover:bg-white/10"
              }`}
            >
              {t === "create" ? "🏠 Create Room" : "🔑 Join Room"}
            </button>
          ))}
        </div>

        {/* ── CREATE tab ── */}
        {tab === "create" && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                maxLength={16}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 focus:outline-none focus:border-blue-400
                  focus:bg-white/15 transition-all"
                placeholder="Player 1"
              />
            </div>

            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-3">
                Max Players
              </label>
              <div className="flex gap-3">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`flex-1 h-14 rounded-xl text-xl font-bold transition-all duration-200 ${
                      maxPlayers === n
                        ? "bg-blue-500 text-white scale-105 ring-2 ring-blue-300/50"
                        : "bg-white/10 text-blue-200 hover:bg-white/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Player color preview */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[0].color }}
                />
                <span className="text-xs font-semibold">{hostName || "You"} (Host)</span>
              </div>
              {Array.from({ length: maxPlayers - 1 }, (_, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[i + 1].color }}
                  />
                  <span className="text-xs text-white/60">Guest {i + 1}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={!isConnected}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500
                hover:from-purple-500 hover:to-purple-400 rounded-2xl text-white text-lg font-bold
                shadow-xl shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02]
                active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Room →
            </button>
          </div>
        )}

        {/* ── JOIN tab ── */}
        {tab === "join" && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 focus:outline-none focus:border-blue-400
                  focus:bg-white/15 transition-all text-center text-2xl font-mono tracking-widest uppercase"
                placeholder="ABC123"
              />
            </div>

            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={16}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 focus:outline-none focus:border-blue-400
                  focus:bg-white/15 transition-all"
                placeholder="Player 2"
              />
            </div>

            {/* Error */}
            {joinError && (
              <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm font-medium">
                ⚠️ {joinError}
              </div>
            )}

            {/* Context-aware instructions */}
            <div className="bg-blue-900/30 rounded-xl p-3 text-xs text-blue-200 leading-relaxed">
              {isLocal ? (
                <>
                  <p className="font-semibold text-blue-100 mb-1">🖥️ Joining on localhost:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Ask the host for their Room Code</li>
                    <li>Open a <strong>new tab</strong> in this browser</li>
                    <li>Enter the code above and press Join</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-blue-100 mb-1">🌐 Joining online:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Get the Room Code from the host</li>
                    <li>Enter the code above (works across devices)</li>
                    <li>Press Join — you'll sync automatically</li>
                  </ol>
                </>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={joinCode.length < 4 || !isConnected}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500
                hover:from-green-500 hover:to-emerald-400 rounded-2xl text-white text-lg font-bold
                shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-[1.02]
                active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                disabled:hover:scale-100"
            >
              Join Room →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
