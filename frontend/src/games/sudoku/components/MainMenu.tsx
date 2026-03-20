// ─── MainMenu ─────────────────────────────────────────────────────────────────
// First screen: choose Local or Room multiplayer mode.

interface Props {
  onSelectLocal: () => void;
  onSelectRoom: () => void;
}

function isLocalhost(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export default function MainMenu({ onSelectLocal, onSelectRoom }: Props) {
  const local = isLocalhost();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-10 w-full max-w-md text-white text-center">

        {/* Logo */}
        <div className="mb-10">
          <div className="text-6xl mb-4">🧩</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow mb-2">
            Sudoku
          </h1>
          <h2 className="text-xl font-semibold text-blue-300">Multiplayer</h2>
          <p className="text-blue-200/70 text-sm mt-2">Turn-based · 2–4 Players</p>
        </div>

        {/* Mode buttons */}
        <div className="flex flex-col gap-4">

          {/* Local (same screen) */}
          <button
            onClick={onSelectLocal}
            className="group relative w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500
              hover:from-blue-500 hover:to-blue-400 rounded-2xl text-white font-bold text-lg
              shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02]
              active:scale-[0.98] overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div className="text-left">
                <div className="font-bold text-lg">Local Multiplayer</div>
                <div className="text-blue-200 text-xs font-normal">
                  All players share the same screen
                </div>
              </div>
            </div>
          </button>

          {/* Room (per-device) */}
          <button
            onClick={onSelectRoom}
            className="group relative w-full py-5 bg-gradient-to-r from-purple-600 to-purple-500
              hover:from-purple-500 hover:to-purple-400 rounded-2xl text-white font-bold text-lg
              shadow-xl shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02]
              active:scale-[0.98] overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{local ? "🗂️" : "🌐"}</span>
              <div className="text-left">
                <div className="font-bold text-lg">Room Multiplayer</div>
                <div className="text-purple-200 text-xs font-normal">
                  {local
                    ? "Each player opens a new tab (same browser)"
                    : "Each player joins from their own device"}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* How it works */}
        <div className="mt-8 bg-white/5 rounded-2xl p-4 text-left text-xs text-blue-200/80 leading-relaxed">
          <p className="font-semibold text-blue-200 mb-2">💡 How Room Mode works:</p>
          <div className="space-y-3">
            {/* Localhost path */}
            <div className={`rounded-xl p-3 ${local ? "bg-blue-500/10 border border-blue-400/20" : "opacity-50"}`}>
              <p className="font-semibold text-blue-300 flex items-center gap-1 mb-1">
                🖥️ On localhost
                {local && <span className="text-green-400 text-[10px] font-bold ml-1">← YOU ARE HERE</span>}
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-200/80">
                <li>Create a room → get a Room Code</li>
                <li>Others open a <strong>new tab</strong> in this browser</li>
                <li>Enter the code — syncs via BroadcastChannel</li>
              </ol>
            </div>

            {/* Deployed path */}
            <div className={`rounded-xl p-3 ${!local ? "bg-purple-500/10 border border-purple-400/20" : "opacity-50"}`}>
              <p className="font-semibold text-purple-300 flex items-center gap-1 mb-1">
                🌐 On deployed server
                {!local && <span className="text-green-400 text-[10px] font-bold ml-1">← YOU ARE HERE</span>}
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-200/80">
                <li>Create a room → get a Room Code</li>
                <li>Others open the site on <strong>any device</strong></li>
                <li>Enter the code — syncs via WebSocket</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
