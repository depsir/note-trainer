'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES } from '@/lib/notes';
import { Clef } from '@/lib/types';
import InteractiveStaff from '@/components/InteractiveStaff';

function accuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? -1 : Math.round((correct / total) * 100);
}

export default function StatsPage() {
  const { stats, config, resetStats } = useNoteStats();
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeClef, setActiveClef] = useState<Clef>('treble');

  const clefNotes = ALL_NOTES.filter((n) => n.clef === activeClef);

  const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0);
  const totalWrong = Object.values(stats).reduce((a, s) => a + s.wrong, 0);
  const overallAcc = accuracy(totalCorrect, totalWrong);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-black text-zinc-800 dark:text-zinc-100">Statistiche</h1>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">
        {/* Overall */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Precisione globale</p>
          {overallAcc >= 0 ? (
            <>
              <p className="text-5xl font-black text-indigo-600">{overallAcc}%</p>
              <p className="text-sm text-zinc-500 mt-1">{totalCorrect} corrette · {totalWrong} errori</p>
            </>
          ) : (
            <p className="text-zinc-400 text-sm mt-2">Nessuna sessione ancora</p>
          )}
        </div>

        {/* Clef tabs */}
        <div className="flex gap-2">
          {(['treble', 'bass'] as Clef[]).map((clef) => (
            <button
              key={clef}
              onClick={() => setActiveClef(clef)}
              className={[
                'flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors',
                activeClef === clef
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400',
              ].join(' ')}
            >
              {clef === 'treble' ? '🎼 Violino' : '𝄢 Basso'}
            </button>
          ))}
        </div>

        {/* Note stats on staff */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3">
          <InteractiveStaff
            notes={clefNotes}
            clef={activeClef}
            noteStats={stats}
            nameSystem={config.nameSystem}
            showClef={false}
          />
          <div className="flex gap-4 justify-center mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />≥ 80</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500" />50–79</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />{'< 50'}</span>
            <span className="text-zinc-300 dark:text-zinc-600">· padronanza</span>
          </div>
        </div>
      </main>

      {/* Reset confirm dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Resetta statistiche?</h2>
            <p className="text-sm text-zinc-500">Tutti i dati di apprendimento verranno cancellati.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-3 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl"
              >
                Annulla
              </button>
              <button
                onClick={() => { resetStats(); setConfirmReset(false); }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl"
              >
                Resetta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
