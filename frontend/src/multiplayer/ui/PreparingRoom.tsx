interface PreparingRoomProps {
  gameTitle: string;
  joinError?: string | null;
}

export default function PreparingRoom({ gameTitle, joinError }: PreparingRoomProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white text-center">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-blue-300/30 border-t-blue-300 animate-spin" />
        <h2 className="text-2xl font-extrabold text-white">Preparing Room…</h2>
        <p className="text-blue-200/80 text-sm mt-2">
          Waiting for the latest room state from the {gameTitle} server.
        </p>
        {joinError && <p className="text-red-300 text-sm mt-4">{joinError}</p>}
      </div>
    </div>
  );
}