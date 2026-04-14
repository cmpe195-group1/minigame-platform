interface Props {
  onSelectLocal: () => void;
  onSelectRoom: () => void;
}

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export default function CheckersMainMenu({ onSelectLocal, onSelectRoom }: Props) {
  const local = isLocalhost();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-10 w-full max-w-md text-white text-center">
        <div className="mb-10">
          <div className="text-6xl mb-4">⛀</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow mb-2">
            Checkers
          </h1>
          <h2 className="text-xl font-semibold text-blue-300">Multiplayer</h2>
          <p className="text-blue-200/70 text-sm mt-2">Classic 1v1 · Local or online room play</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={onSelectLocal}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-2xl text-white font-bold text-lg shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div className="text-left">
                <div className="font-bold text-lg">Local Match</div>
                <div className="text-blue-200 text-xs font-normal">
                  Two players share one screen
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={onSelectRoom}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-2xl text-white font-bold text-lg shadow-xl shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{local ? "🗂️" : "🌐"}</span>
              <div className="text-left">
                <div className="font-bold text-lg">Room Multiplayer</div>
                <div className="text-purple-200 text-xs font-normal">
                  {local
                    ? "Open another tab or browser window to join"
                    : "Play across different devices"}
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 bg-white/5 rounded-2xl p-4 text-left text-xs text-blue-200/80 leading-relaxed">
          <p className="font-semibold text-blue-200 mb-2">How room play works</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a room and copy the 6-character room code.</li>
            <li>The second player joins with that code.</li>
            <li>The host starts the match once both players are present.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
