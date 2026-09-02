'use client';

import Link from 'next/link';

interface SessionSummaryProps {
  correct: number;
  total: number;
  onRestart: () => void;
  /** Only note reading keeps per-item stats worth linking to */
  showStatsLink?: boolean;
}

export default function SessionSummary({ correct, total, onRestart, showStatsLink }: SessionSummaryProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">Sessione completata!</h2>
        <p className="text-zinc-500 mt-1">{correct} corrette su {total} tentativi</p>
        {total > 0 && (
          <p className="text-4xl font-black text-indigo-600 mt-3">
            {Math.round((correct / total) * 100)}%
          </p>
        )}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={onRestart} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors">
          Ancora
        </button>
        {showStatsLink && (
          <Link href="/stats" className="flex-1 py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl text-center hover:bg-zinc-50">
            Statistiche
          </Link>
        )}
      </div>
    </div>
  );
}
