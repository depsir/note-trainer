'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Dialog from '@/components/Dialog';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, displayNoteName, noteId } from '@/lib/notes';
import { Clef } from '@/lib/types';
import InteractiveStaff from '@/components/InteractiveStaff';
import { averageCorrectResponseTime, normalizeNoteStats } from '@/lib/adaptive';

function accuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? -1 : Math.round((correct / total) * 100);
}

function formatAverageResponse(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
}

type QuickFilter = 'all' | 'review' | 'new' | 'excluded';
type SortMode = 'note' | 'accuracy';

/** Below this, a note that has been asked is worth going back to */
const REVIEW_BELOW = 80;

export default function StatsPage() {
  const { stats, config, resetStats } = useNoteStats();
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeClef, setActiveClef] = useState<Clef>('treble');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('note');

  // Every reading exercise answers the same notes, so their pools are read together.
  const drills = useMemo(
    () => [config.notes, config.play, config.notesChallenge, config.playChallenge],
    [config.notes, config.play, config.notesChallenge, config.playChallenge]
  );
  const activeNoteIds = useMemo(
    () =>
      new Set(
        ALL_NOTES.filter((n) => drills.some((d) => d.clefs.includes(n.clef) && d.enabledNotes.includes(noteId(n)))).map(noteId)
      ),
    [drills]
  );
  const ledgerLines = Math.max(...drills.map((d) => d.ledgerLines));

  // The practised range, plus anything outside it that was answered before the range narrowed
  const clefNotes = ALL_NOTES.filter((n) => {
    if (n.clef !== activeClef) return false;
    const noteStats = normalizeNoteStats(stats[noteId(n)]);
    return n.ledgerLines <= ledgerLines || noteStats.correct + noteStats.wrong > 0;
  });

  const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0);
  const totalWrong = Object.values(stats).reduce((a, s) => a + s.wrong, 0);
  const overallAcc = accuracy(totalCorrect, totalWrong);
  const noteRows = clefNotes.map((note, index) => {
    const id = noteId(note);
    const noteStats = normalizeNoteStats(stats[id]);
    const total = noteStats.correct + noteStats.wrong;
    const acc = accuracy(noteStats.correct, noteStats.wrong);
    return {
      id,
      index,
      note,
      total,
      accuracy: acc,
      averageResponseMs: averageCorrectResponseTime(noteStats),
      stats: noteStats,
      active: activeNoteIds.has(id),
      review: total > 0 && acc < REVIEW_BELOW,
    };
  });

  const matches = (row: (typeof noteRows)[number], filter: QuickFilter) => {
    switch (filter) {
      case 'review':
        return row.review;
      case 'new':
        return row.active && row.total === 0;
      case 'excluded':
        return !row.active;
      default:
        return true;
    }
  };

  const filterOptions: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'review', label: 'Da ripassare' },
    { key: 'new', label: 'Mai uscite' },
    { key: 'excluded', label: 'Escluse' },
  ];

  const visibleRows = noteRows.filter((row) => matches(row, quickFilter));
  if (sortMode === 'accuracy') {
    // Never asked goes last: there is nothing to say about it yet.
    visibleRows.sort((a, b) => (a.total === 0 ? 101 : a.accuracy) - (b.total === 0 ? 101 : b.accuracy) || a.index - b.index);
  }

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">Statistiche</h1>
          <p className="text-sm text-zinc-500">Come vai con le singole note, in “Leggi le note” e “Suona le note”.</p>
        </div>

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

        <div className="space-y-3">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Filtri rapidi</p>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setQuickFilter(option.key)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                      quickFilter === option.key
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800',
                    ].join(' ')}
                  >
                    {option.label} <span className="opacity-75">{noteRows.filter((row) => matches(row, option.key)).length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Ordinamento</p>
                <div className="mt-2 inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-1 bg-zinc-50 dark:bg-zinc-800/60">
                  {([
                    ['note', 'Per nota'],
                    ['accuracy', 'Più sbagliate prima'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setSortMode(value)}
                      className={[
                        'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                        sortMode === value
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-500 text-right">
                {visibleRows.length} {visibleRows.length === 1 ? 'nota visibile' : 'note visibili'}
              </p>
            </div>
          </div>

          {visibleRows.map(({ id, note, total, accuracy, averageResponseMs, stats: noteStats, active, review }) => (
            <div
              key={id}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-zinc-800 dark:text-zinc-100">
                    {displayNoteName(note.letter, config.nameSystem)}
                    <span className="text-zinc-400 dark:text-zinc-500"> {note.octave}</span>
                  </p>
                </div>
                {(review || !active) && (
                  <span
                    className={[
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
                      review
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
                    ].join(' ')}
                  >
                    {review ? 'Da ripassare' : 'Esclusa'}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Risposte</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">
                    {noteStats.correct} ✓ · {noteStats.wrong} ✗
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Precisione</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">{accuracy >= 0 ? `${accuracy}%` : '—'}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Tempo medio</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">{formatAverageResponse(averageResponseMs)}</p>
                </div>
              </div>

              {total === 0 && (
                <p className="mt-1 text-xs text-zinc-400">
                  Nessun tentativo registrato ancora.
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setConfirmReset(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-500 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900"
        >
          <Trash2 size={16} /> Azzera le statistiche
        </button>
      </main>

      {confirmReset && (
        <Dialog title="Azzerare le statistiche?" size="sm" onClose={() => setConfirmReset(false)}>
          <p className="text-sm text-zinc-500">Risposte, precisione e tempi di tutte le note verranno cancellati. Non si può annullare.</p>
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
              Azzera
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
