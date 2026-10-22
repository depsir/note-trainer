'use client';

import Link from 'next/link';

interface SessionSummaryProps {
  correct: number;
  total: number;
  onRestart: () => void;
  /** Back to the exercise's setup screen */
  onSettings: () => void;
  /** Extra line under the percentage, for modes scored by sequence as well as by tap */
  detail?: string;
  /** Takes the percentage's place as the headline, for a challenge scored by how much got done */
  score?: string;
}

export default function SessionSummary({ correct, total, onRestart, onSettings, detail, score }: SessionSummaryProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">Sessione completata!</h2>
        <p className="text-zinc-500 mt-1">{correct} corrette su {total} tentativi</p>
        {(score || total > 0) && (
          <p className="text-4xl font-black text-indigo-600 mt-3">
            {score ?? `${Math.round((correct / total) * 100)}%`}
          </p>
        )}
        {detail && <p className="text-sm font-semibold text-zinc-500 mt-2">{detail}</p>}
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={onRestart} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors">
          Ancora, con le stesse impostazioni
        </button>
        <button onClick={onSettings} className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
          Cambia impostazioni
        </button>
        <Link href="/" className="w-full py-3 text-center bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
