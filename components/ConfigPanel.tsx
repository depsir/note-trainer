'use client';

import { useState } from 'react';
import {
  ExerciseConfig,
  FifthsQuestionKind,
  IntervalPresentation,
  IntervalQualityScope,
  RelativeQuestionKind,
  ScaleType,
} from '@/lib/types';
import { ALL_NOTES, noteId } from '@/lib/notes';
import { X } from 'lucide-react';
import InteractiveStaff from '@/components/InteractiveStaff';
import {
  ALL_QUESTION_KINDS,
  FULL_KEY_GRID,
  displayKeyName,
  getDefaultEnabledKeys,
  keyIdsForTypes,
  QUESTION_KIND_HINT,
  QUESTION_KIND_LABEL,
} from '@/lib/fifths';
import {
  ALL_DEGREES,
  ALL_QUALITY_SCOPES,
  displayDegreeOrdinal,
  QUALITY_SCOPE_HINT,
  QUALITY_SCOPE_LABEL,
} from '@/lib/intervals';
import {
  ALL_RELATIVE_QUESTION_KINDS,
  getRelativePair,
  RELATIVE_QUESTION_KIND_HINT,
  RELATIVE_QUESTION_KIND_LABEL,
} from '@/lib/relatives';
import {
  ALL_SCALE_TYPES,
  displaySpelledNoteName,
  SCALE_TYPE_HINT,
  SCALE_TYPE_LABEL,
  scaleCandidates,
} from '@/lib/scales';

interface ConfigPanelProps {
  config: ExerciseConfig;
  onSave: (c: ExerciseConfig) => void;
  onClose: () => void;
  isPlaying?: boolean;
}

const MIN_ENABLED_KEYS = 2;
const MIN_ENABLED_DEGREES = 1;
const MIN_ENABLED_TONICS = 2;
const MIN_ENABLED_SCALE_TYPES = 1;

const KEY_PRESETS: { label: string; ids: () => string[] }[] = [
  { label: 'Tutte', ids: getDefaultEnabledKeys },
  { label: 'Solo ♯', ids: () => keyIdsForTypes(['sharp']) },
  { label: 'Solo ♭', ids: () => keyIdsForTypes(['flat']) },
];

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '∞', value: 0 },
];

export default function ConfigPanel({ config, onSave, onClose, isPlaying }: ConfigPanelProps) {
  const [draft, setDraft] = useState<ExerciseConfig>({ ...config });

  const toggleClef = (clef: 'treble' | 'bass') => {
    const next = draft.clefs.includes(clef)
      ? draft.clefs.filter((c) => c !== clef)
      : [...draft.clefs, clef];
    if (next.length === 0) return; // at least one clef required
    // Auto-update enabledNotes to include new clef's notes
    const existingIds = new Set(draft.enabledNotes);
    const clefNotes = ALL_NOTES.filter((n) => n.clef === clef).map((n) => noteId(n));
    let newEnabled: string[];
    if (draft.clefs.includes(clef)) {
      // removing clef — remove its notes
      newEnabled = draft.enabledNotes.filter((id) => !clefNotes.includes(id));
    } else {
      // adding clef — add its notes
      newEnabled = [...existingIds, ...clefNotes];
    }
    setDraft({ ...draft, clefs: next, enabledNotes: newEnabled });
  };

  const toggleNote = (id: string) => {
    const enabled = new Set(draft.enabledNotes);
    if (enabled.has(id)) {
      if (enabled.size <= 2) return; // keep at least 2 notes
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setDraft({ ...draft, enabledNotes: [...enabled] });
  };

  const toggleAllClef = (clef: 'treble' | 'bass', select: boolean) => {
    const clefNoteIds = ALL_NOTES.filter((n) => n.clef === clef).map((n) => noteId(n));
    const existing = new Set(draft.enabledNotes);
    if (select) {
      clefNoteIds.forEach((id) => existing.add(id));
    } else {
      const remaining = draft.enabledNotes.filter((id) => !clefNoteIds.includes(id));
      if (remaining.length < 2) return;
      clefNoteIds.forEach((id) => existing.delete(id));
    }
    setDraft({ ...draft, enabledNotes: [...existing] });
  };

  const toggleQuestionKind = (kind: FifthsQuestionKind) => {
    const enabled = new Set(draft.fifths.questionKinds);
    if (enabled.has(kind)) {
      if (enabled.size <= 1) return; // at least one question kind required
      enabled.delete(kind);
    } else {
      enabled.add(kind);
    }
    setDraft({ ...draft, fifths: { ...draft.fifths, questionKinds: [...enabled] } });
  };

  const toggleKey = (id: string) => {
    const enabled = new Set(draft.fifths.enabledKeys);
    if (enabled.has(id)) {
      if (enabled.size <= MIN_ENABLED_KEYS) return;
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setDraft({ ...draft, fifths: { ...draft.fifths, enabledKeys: [...enabled] } });
  };

  const applyKeyPreset = (ids: string[]) => {
    setDraft({ ...draft, fifths: { ...draft.fifths, enabledKeys: ids } });
  };

  const toggleRelativeKind = (kind: RelativeQuestionKind) => {
    const enabled = new Set(draft.relatives.questionKinds);
    if (enabled.has(kind)) {
      if (enabled.size <= 1) return; // at least one direction required
      enabled.delete(kind);
    } else {
      enabled.add(kind);
    }
    setDraft({
      ...draft,
      relatives: {
        ...draft.relatives,
        questionKinds: ALL_RELATIVE_QUESTION_KINDS.filter((k) => enabled.has(k)),
      },
    });
  };

  const toggleRelativePair = (id: string) => {
    const enabled = new Set(draft.relatives.enabledKeys);
    if (enabled.has(id)) {
      if (enabled.size <= MIN_ENABLED_KEYS) return;
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setDraft({ ...draft, relatives: { ...draft.relatives, enabledKeys: [...enabled] } });
  };

  const toggleDegree = (degree: number) => {
    const enabled = new Set(draft.intervals.enabledDegrees);
    if (enabled.has(degree)) {
      if (enabled.size <= MIN_ENABLED_DEGREES) return;
      enabled.delete(degree);
    } else {
      enabled.add(degree);
    }
    setDraft({ ...draft, intervals: { ...draft.intervals, enabledDegrees: [...enabled].sort((a, b) => a - b) } });
  };

  const setPresentation = (presentation: IntervalPresentation) => {
    setDraft({ ...draft, intervals: { ...draft.intervals, presentation } });
  };

  const setQualityScope = (qualityScope: IntervalQualityScope) => {
    setDraft({ ...draft, intervals: { ...draft.intervals, qualityScope } });
  };

  const toggleScaleType = (type: ScaleType) => {
    const enabled = new Set(draft.scales.enabledTypes);
    if (enabled.has(type)) {
      if (enabled.size <= MIN_ENABLED_SCALE_TYPES) return;
      enabled.delete(type);
    } else {
      enabled.add(type);
    }
    setDraft({
      ...draft,
      scales: { ...draft.scales, enabledTypes: ALL_SCALE_TYPES.filter((t) => enabled.has(t)) },
    });
  };

  const toggleTonic = (id: string) => {
    const enabled = new Set(draft.scales.enabledTonics);
    if (enabled.has(id)) {
      if (enabled.size <= MIN_ENABLED_TONICS) return;
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setDraft({ ...draft, scales: { ...draft.scales, enabledTonics: [...enabled] } });
  };

  const isFifths = draft.mode === 'fifths';
  const isScales = draft.mode === 'scales';
  const isIntervals = draft.mode === 'intervals';
  const isRelatives = draft.mode === 'relatives';
  // Scales and relative keys are asked and answered by name — nothing is ever drawn on a staff.
  const usesStaff = !isScales && !isRelatives;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-bold">Impostazioni</h2>
            <p className="text-xs text-zinc-400">
              {isFifths
                ? 'Tonalità'
                : isRelatives
                  ? 'Relative'
                  : isScales
                    ? 'Scale'
                    : isIntervals
                      ? 'Intervalli'
                      : 'Lettura note'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {isPlaying && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              ⚠️ Sessione in corso — le modifiche saranno applicate alla prossima sessione.
            </div>
          )}
          {/* Duration */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Durata</h3>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDraft({ ...draft, durationSeconds: opt.value })}
                  className={[
                    'px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.durationSeconds === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Clef */}
          {usesStaff && (
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Chiave</h3>
            <div className="flex gap-3">
              {(['treble', 'bass'] as const).map((clef) => (
                <button
                  key={clef}
                  onClick={() => toggleClef(clef)}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.clefs.includes(clef)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {clef === 'treble' ? '🎼 Violino' : '𝄢 Basso'}
                </button>
              ))}
            </div>
            {isFifths && (
              <p className="text-xs text-zinc-400 mt-1">Chiavi in cui viene disegnata l’armatura</p>
            )}
          </section>
          )}

          {/* Note name system */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Nomi note</h3>
            <div className="flex gap-3">
              {(['italian', 'english'] as const).map((sys) => (
                <button
                  key={sys}
                  onClick={() => setDraft({ ...draft, nameSystem: sys })}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.nameSystem === sys
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {sys === 'italian' ? 'Do Re Mi' : 'C D E'}
                </button>
              ))}
            </div>
          </section>

          {/* Adaptive — adaptive weighting only applies to note reading */}
          {draft.mode === 'notes' && (
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Apprendimento adattivo</h3>
            <button
              onClick={() => setDraft({ ...draft, useAdaptive: !draft.useAdaptive })}
              className={[
                'w-full py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                draft.useAdaptive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
              ].join(' ')}
            >
              {draft.useAdaptive ? '✓ Attivo — propone più le note difficili' : 'Disattivo — casuale uniforme'}
            </button>
          </section>
          )}

          {/* Circle-of-fifths question kinds */}
          {isFifths && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Domande</h3>
              <div className="flex flex-col gap-2">
                {ALL_QUESTION_KINDS.map((kind) => {
                  const enabled = draft.fifths.questionKinds.includes(kind);
                  return (
                    <button
                      key={kind}
                      onClick={() => toggleQuestionKind(kind)}
                      className={[
                        'w-full px-4 py-2 rounded-xl text-left border-2 transition-colors',
                        enabled
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-semibold">{QUESTION_KIND_LABEL[kind]}</span>
                      <span className={['block text-xs', enabled ? 'text-indigo-100' : 'text-zinc-400'].join(' ')}>
                        {QUESTION_KIND_HINT[kind]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Circle-of-fifths key pool */}
          {isFifths && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Tonalità in esercizio</h3>
                <div className="flex gap-2">
                  {KEY_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyKeyPreset(preset.ids())}
                      className="text-xs text-indigo-600 font-semibold"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {FULL_KEY_GRID.flatMap((row) =>
                  row.cells.map((key, column) =>
                    key ? (
                      <button
                        key={key.id}
                        onClick={() => toggleKey(key.id)}
                        aria-pressed={draft.fifths.enabledKeys.includes(key.id)}
                        className={[
                          'h-10 rounded-lg text-sm font-semibold border-2 transition-colors',
                          draft.fifths.enabledKeys.includes(key.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-400',
                        ].join(' ')}
                      >
                        {displayKeyName(key, draft.nameSystem)}
                      </button>
                    ) : (
                      <div key={`${row.accidental}-${column}`} aria-hidden />
                    )
                  )
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {draft.fifths.enabledKeys.length} tonalità attive — tocca per escluderle
              </p>
            </section>
          )}

          {/* Relative pair directions */}
          {isRelatives && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Da dove partire</h3>
              <div className="flex flex-col gap-2">
                {ALL_RELATIVE_QUESTION_KINDS.map((kind) => {
                  const enabled = draft.relatives.questionKinds.includes(kind);
                  return (
                    <button
                      key={kind}
                      onClick={() => toggleRelativeKind(kind)}
                      aria-pressed={enabled}
                      className={[
                        'w-full px-4 py-2 rounded-xl text-left border-2 transition-colors',
                        enabled
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-semibold">{RELATIVE_QUESTION_KIND_LABEL[kind]}</span>
                      <span className={['block text-xs', enabled ? 'text-indigo-100' : 'text-zinc-400'].join(' ')}>
                        {RELATIVE_QUESTION_KIND_HINT[kind]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Relative pair pool — the circle-of-fifths grid, each cell showing both names */}
          {isRelatives && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Coppie in esercizio</h3>
                <button
                  onClick={() => setDraft({ ...draft, relatives: { ...draft.relatives, enabledKeys: getDefaultEnabledKeys() } })}
                  className="text-xs text-indigo-600 font-semibold"
                >
                  Tutte
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {FULL_KEY_GRID.flatMap((row) =>
                  row.cells.map((key, column) => {
                    const pair = key && getRelativePair(key.id);
                    return pair ? (
                      <button
                        key={pair.id}
                        onClick={() => toggleRelativePair(pair.id)}
                        aria-pressed={draft.relatives.enabledKeys.includes(pair.id)}
                        className={[
                          'h-12 rounded-lg border-2 leading-tight transition-colors',
                          draft.relatives.enabledKeys.includes(pair.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-400',
                        ].join(' ')}
                      >
                        <span className="block text-xs font-semibold">
                          {displaySpelledNoteName(pair.major, draft.nameSystem)}
                        </span>
                        <span className="block text-[10px] opacity-70">
                          {displaySpelledNoteName(pair.minor, draft.nameSystem)}
                        </span>
                      </button>
                    ) : (
                      <div key={`${row.accidental}-${column}`} aria-hidden />
                    );
                  })
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {draft.relatives.enabledKeys.length} coppie attive — maggiore sopra, relativa minore sotto
              </p>
            </section>
          )}

          {/* Interval qualities */}
          {isIntervals && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Qualità</h3>
              <div className="flex flex-col gap-2">
                {ALL_QUALITY_SCOPES.map((scope) => {
                  const selected = draft.intervals.qualityScope === scope;
                  return (
                    <button
                      key={scope}
                      onClick={() => setQualityScope(scope)}
                      aria-pressed={selected}
                      className={[
                        'w-full px-4 py-2 rounded-xl text-left border-2 transition-colors',
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-semibold">{QUALITY_SCOPE_LABEL[scope]}</span>
                      <span className={['block text-xs', selected ? 'text-indigo-100' : 'text-zinc-400'].join(' ')}>
                        {QUALITY_SCOPE_HINT[scope]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Interval presentation */}
          {isIntervals && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Come mostrarlo</h3>
              <div className="flex gap-3">
                {(['staff', 'letters'] as const).map((presentation) => (
                  <button
                    key={presentation}
                    onClick={() => setPresentation(presentation)}
                    className={[
                      'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                      draft.intervals.presentation === presentation
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                    ].join(' ')}
                  >
                    {presentation === 'staff' ? 'Pentagramma' : 'Nomi delle note'}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Interval degrees pool */}
          {isIntervals && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Gradi</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {ALL_DEGREES.map((degree) => (
                  <button
                    key={degree}
                    onClick={() => toggleDegree(degree)}
                    aria-pressed={draft.intervals.enabledDegrees.includes(degree)}
                    className={[
                      'h-10 rounded-lg text-sm font-semibold border-2 transition-colors',
                      draft.intervals.enabledDegrees.includes(degree)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-400',
                    ].join(' ')}
                  >
                    {displayDegreeOrdinal(degree)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {draft.intervals.enabledDegrees.length} gradi attivi — tocca per escluderli
              </p>
            </section>
          )}

          {/* Scale types */}
          {isScales && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Tipi di scala</h3>
              <div className="flex flex-col gap-2">
                {ALL_SCALE_TYPES.map((type) => {
                  const enabled = draft.scales.enabledTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleScaleType(type)}
                      aria-pressed={enabled}
                      className={[
                        'w-full px-4 py-2 rounded-xl text-left border-2 transition-colors',
                        enabled
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-semibold">{SCALE_TYPE_LABEL[type]}</span>
                      <span className={['block text-xs', enabled ? 'text-indigo-100' : 'text-zinc-400'].join(' ')}>
                        {SCALE_TYPE_HINT[type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Scale tonics — same spellings as the circle-of-fifths grid */}
          {isScales && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Toniche</h3>
                <button
                  onClick={() => setDraft({ ...draft, scales: { ...draft.scales, enabledTonics: getDefaultEnabledKeys() } })}
                  className="text-xs text-indigo-600 font-semibold"
                >
                  Tutte
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {FULL_KEY_GRID.flatMap((row) =>
                  row.cells.map((key, column) =>
                    key ? (
                      <button
                        key={key.id}
                        onClick={() => toggleTonic(key.id)}
                        aria-pressed={draft.scales.enabledTonics.includes(key.id)}
                        className={[
                          'h-10 rounded-lg text-sm font-semibold border-2 transition-colors',
                          draft.scales.enabledTonics.includes(key.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-400',
                        ].join(' ')}
                      >
                        {displayKeyName(key, draft.nameSystem)}
                      </button>
                    ) : (
                      <div key={`${row.accidental}-${column}`} aria-hidden />
                    )
                  )
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {scaleCandidates(draft.scales.enabledTonics, draft.scales.enabledTypes).length} scale in esercizio —
                {' '}restano fuori le combinazioni che richiederebbero doppie alterazioni (es. Sol♯ minore armonica)
              </p>
            </section>
          )}

          {/* Note selection — interactive staff */}
          {draft.mode === 'notes' && draft.clefs.map((clef) => {
            const clefNotes = ALL_NOTES.filter((n) => n.clef === clef);
            const allSelected = clefNotes.every((n) => draft.enabledNotes.includes(noteId(n)));
            return (
              <section key={clef}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                    Note — {clef === 'treble' ? 'Violino' : 'Basso'}
                  </h3>
                  <button
                    onClick={() => toggleAllClef(clef, !allSelected)}
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    {allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden px-1 py-1">
                  <InteractiveStaff
                    notes={clefNotes}
                    clef={clef}
                    enabledNotes={new Set(draft.enabledNotes)}
                    onToggleNote={toggleNote}
                    nameSystem={draft.nameSystem}
                    showClef={false}
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1">Tocca una nota per attivarla / disattivarla</p>
              </section>
            );
          })}
        </div>

        {/* Save */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors"
          >
            Salva impostazioni
          </button>
        </div>
      </div>
    </div>
  );
}
