'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, displayNoteName, noteId } from '@/lib/notes';
import { Clef } from '@/lib/types';

function accuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? -1 : Math.round((correct / total) * 100);
}

function AccuracyBar({ value }: { value: number }) {
  if (value < 0) return <span className="text-xs text-zinc-400">Nessun dato</span>;
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold w-10 text-right text-zinc-600 dark:text-zinc-400">{value}%</span>
    </div>
  );
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

        {/* Note list */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {clefNotes.map((note) => {
            const id = noteId(note);
            const s = stats[id];
            const acc = s ? accuracy(s.correct, s.wrong) : -1;
            const total = s ? s.correct + s.wrong : 0;
            return (
              <div key={id} className="px-4 py-3 flex items-center gap-4">
                <div className="w-12 text-center">
                  <span className="text-base font-black text-zinc-800 dark:text-zinc-100">
                    {displayNoteName(note.letter, config.nameSystem)}
                  </span>
                  <span className="text-xs text-zinc-400 block">{note.octave}</span>
                </div>
                <div className="flex-1">
                  <AccuracyBar value={acc} />
                  {total > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5">{total} tentativi</p>
                  )}
                </div>
                {note.isLedger && (
                  <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">+riga</span>
                )}
              </div>
            );
          })}
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
