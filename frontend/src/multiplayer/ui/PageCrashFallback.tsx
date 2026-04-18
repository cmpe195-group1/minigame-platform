interface PageCrashFallbackProps {
  onBack: () => void;
  message?: string;
}

export default function PageCrashFallback({
  onBack,
  message = "Something went wrong.",
}: PageCrashFallbackProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <div className="text-center bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <p className="text-xl font-semibold mb-3">{message}</p>
        <p className="text-sm text-slate-300 mb-6">
          Try going back to the main menu.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}