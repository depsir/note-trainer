'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, displayNoteName, noteId } from '@/lib/notes';
import { Clef } from '@/lib/types';
import InteractiveStaff from '@/components/InteractiveStaff';
import { averageCorrectResponseTime, getSelectionInsight, normalizeNoteStats } from '@/lib/adaptive';

function accuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? -1 : Math.round((correct / total) * 100);
}

function formatShare(share: number): string {
  const pct = share * 100;
  if (pct === 0) return '0%';
  if (pct < 1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(1)}%`;
}

function formatAverageResponse(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
}

function priorityBadgeClasses(tone: ReturnType<typeof getSelectionInsight>['tone']): string {
  switch (tone) {
    case 'red':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/60';
    case 'amber':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60';
    case 'violet':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/60';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60';
    case 'sky':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/60';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

function frequencyBarClasses(tone: ReturnType<typeof getSelectionInsight>['tone']): string {
  switch (tone) {
    case 'red':
      return 'bg-red-500';
    case 'amber':
      return 'bg-amber-500';
    case 'violet':
      return 'bg-violet-500';
    case 'emerald':
      return 'bg-emerald-500';
    case 'sky':
      return 'bg-sky-500';
    default:
      return 'bg-zinc-400';
  }
}

type QuickFilter = 'all' | 'review' | 'new' | 'stable' | 'excluded';
type SortMode = 'note' | 'priority';

function isReviewTone(tone: ReturnType<typeof getSelectionInsight>['tone']): boolean {
  return tone === 'red' || tone === 'amber';
}

export default function StatsPage() {
  const { stats, config, resetStats } = useNoteStats();
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeClef, setActiveClef] = useState<Clef>('treble');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('note');

  const clefNotes = ALL_NOTES.filter((n) => n.clef === activeClef);
  const activeNoteIds = config.enabledNotes;
  const activeNoteCount = activeNoteIds.length;
  const unseenActiveNotes = activeNoteIds.filter((id) => {
    const noteStats = normalizeNoteStats(stats[id]);
    return noteStats.correct + noteStats.wrong === 0;
  }).length;

  const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0);
  const totalWrong = Object.values(stats).reduce((a, s) => a + s.wrong, 0);
  const overallAcc = accuracy(totalCorrect, totalWrong);
  const noteRows = clefNotes.map((note, index) => {
    const id = noteId(note);
    const noteStats = normalizeNoteStats(stats[id]);
    const total = noteStats.correct + noteStats.wrong;
    const insight = getSelectionInsight(id, activeNoteIds, stats, config.useAdaptive);

    return {
      id,
      index,
      note,
      total,
      accuracy: accuracy(noteStats.correct, noteStats.wrong),
      averageResponseMs: averageCorrectResponseTime(noteStats),
      stats: noteStats,
      insight,
    };
  });

  const filterOptions: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'review', label: 'Da ripassare' },
    { key: 'new', label: 'Nuove' },
    { key: 'stable', label: 'Stabili' },
    { key: 'excluded', label: 'Escluse' },
  ];

  const filterCounts = noteRows.reduce<Record<QuickFilter, number>>(
    (counts, row) => {
      counts.all += 1;
      if (isReviewTone(row.insight.tone)) counts.review += 1;
      if (row.insight.priorityLabel === 'Nuova') counts.new += 1;
      if (row.insight.tone === 'emerald') counts.stable += 1;
      if (row.insight.priorityLabel === 'Esclusa') counts.excluded += 1;
      return counts;
    },
    { all: 0, review: 0, new: 0, stable: 0, excluded: 0 }
  );

  const visibleRows = useMemo(() => {
    const filteredRows = noteRows.filter((row) => {
      switch (quickFilter) {
        case 'review':
          return isReviewTone(row.insight.tone);
        case 'new':
          return row.insight.priorityLabel === 'Nuova';
        case 'stable':
          return row.insight.tone === 'emerald';
        case 'excluded':
          return row.insight.priorityLabel === 'Esclusa';
        default:
          return true;
      }
    });

    if (sortMode === 'note') {
      return filteredRows;
    }

    const priorityRank: Record<ReturnType<typeof getSelectionInsight>['tone'], number> = {
      red: 5,
      amber: 4,
      violet: 3,
      sky: 2,
      emerald: 1,
      zinc: 0,
    };

    return [...filteredRows].sort((a, b) => {
      const toneDelta = priorityRank[b.insight.tone] - priorityRank[a.insight.tone];
      if (toneDelta !== 0) return toneDelta;
      const shareDelta = b.insight.share - a.insight.share;
      if (shareDelta !== 0) return shareDelta;
      const weightDelta = b.stats.weight - a.stats.weight;
      if (weightDelta !== 0) return weightDelta;
      return a.index - b.index;
    });
  }, [noteRows, quickFilter, sortMode]);

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

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-200">Come decide l&apos;algoritmo</h2>
            <p className="text-sm text-zinc-500">
              {config.useAdaptive
                ? unseenActiveNotes > 0
                  ? `Ci sono ancora ${unseenActiveNotes} note nuove nel pool attivo: finche non compaiono almeno una volta, hanno precedenza e si dividono la frequenza in modo uniforme.`
                  : `La frequenza stimata nasce dal peso attuale di ogni nota sul pool attivo di ${activeNoteCount} note abilitate.`
                : `La modalita casuale e attiva: tutte le ${activeNoteCount} note abilitate hanno la stessa frequenza, anche se il peso storico resta visibile.`}
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            La frequenza stimata e indicativa: la scelta reale evita di ripetere subito la stessa nota.
          </p>
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
                    {option.label} <span className="opacity-75">{filterCounts[option.key]}</span>
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
                    ['priority', 'Per priorita'],
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

          {visibleRows.map(({ id, note, total, accuracy, averageResponseMs, stats: noteStats, insight }) => (
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
                <div className="text-right space-y-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${priorityBadgeClasses(insight.tone)}`}>
                    Priorita {insight.priorityLabel}
                  </span>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                    Frequenza stimata {formatShare(insight.share)}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${frequencyBarClasses(insight.tone)}`}
                  style={{ width: `${Math.max(insight.share * 100, insight.share > 0 ? 2 : 0)}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Risposte</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">
                    {noteStats.correct} corrette · {noteStats.wrong} errori
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Precisione</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">{accuracy >= 0 ? `${accuracy}%` : '—'}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Tempo medio corrette</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">{formatAverageResponse(averageResponseMs)}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Peso</p>
                  <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">{noteStats.weight.toFixed(2)}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{insight.reason}</p>
              {total === 0 && (
                <p className="mt-1 text-xs text-zinc-400">
                  Nessun tentativo registrato ancora.
                </p>
              )}
            </div>
          ))}
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
