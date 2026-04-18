import React from "react";

interface LocalSetupCardProps {
  title: string;
  subtitle: string;
  notes: string[];
  startLabel?: string;
  onStart: () => void;
  onBack: () => void;
}

export default function LocalSetupCard({
  title,
  subtitle,
  notes,
  startLabel = "Start",
  onStart,
  onBack,
}: LocalSetupCardProps) {
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
            <h2 className="text-2xl font-extrabold text-white">{title}</h2>
            <p className="text-sm text-blue-300">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100 space-y-2">
          <p className="font-semibold text-white">Before you start</p>
          <ul className="list-disc list-inside space-y-1 text-blue-200/80">
            {notes.map((note, index) => (
              <li key={`${index}-${note}`}>{note}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={onStart}
          className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-2xl text-white text-lg font-bold shadow-xl shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {startLabel} →
        </button>
      </div>
    </div>
  );
}