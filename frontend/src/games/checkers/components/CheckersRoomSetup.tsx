import { useState } from "react";

interface Props {
  onCreateRoom: (hostName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onBack: () => void;
  joinError?: string | null;
  isConnected?: boolean;
}

export default function CheckersRoomSetup({
  onCreateRoom,
  onJoinRoom,
  onBack,
  joinError,
  isConnected = true,
}: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [hostName, setHostName] = useState("Player 1");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Player 2");

  const handleCreate = () => {
    onCreateRoom(hostName.trim() || "Player 1");
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      return;
    }
    onJoinRoom(code, joinName.trim() || "Player 2");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-sm"
          >
            ←
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Checkers Room</h2>
            <div className="flex items-center gap-2 mt-1 text-xs font-semibold">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  isConnected
                    ? "bg-green-500/20 text-green-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {isConnected ? "Connected to server" : "Connecting to server…"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                2 Players
              </span>
            </div>
          </div>
        </div>

        <div className="flex rounded-xl overflow-hidden border border-white/20 mb-6">
          {(["create", "join"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                tab === value
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-blue-300 hover:bg-white/10"
              }`}
            >
              {value === "create" ? "Create Room" : "Join Room"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                maxLength={16}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                placeholder="Player 1"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100">
              <p className="font-semibold text-white mb-2">Room rules</p>
              <ul className="space-y-1 text-blue-200/80 list-disc list-inside">
                <li>The host always plays as White.</li>
                <li>The joining player always plays as Black.</li>
                <li>The host can restart back to the lobby after a game.</li>
              </ul>
            </div>

            <button
              onClick={handleCreate}
              disabled={!isConnected}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Create Room →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-blue-200 font-semibold uppercase tracking-widest block mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-center text-2xl font-mono tracking-widest uppercase"
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
                onChange={(event) => setJoinName(event.target.value)}
                maxLength={16}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                placeholder="Player 2"
              />
            </div>

            {joinError && (
              <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm font-medium">
                ⚠️ {joinError}
              </div>
            )}

            <div className="bg-blue-900/30 rounded-xl p-3 text-xs text-blue-200 leading-relaxed">
              Ask the host for the room code, enter it here, and you will join as the Black pieces.
            </div>

            <button
              onClick={handleJoin}
              disabled={joinCode.trim().length < 4 || !isConnected}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Join Room →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
