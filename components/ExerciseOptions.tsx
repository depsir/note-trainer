'use client';

import { ReactNode, useEffect, useState } from 'react';
import AudioInputSettings from '@/components/AudioInputSettings';
import InteractiveStaff from '@/components/InteractiveStaff';
import { Choice, ChoiceCard, OptionSection, SectionAction } from '@/components/options';
import { getNotesByClef, MAX_LEDGER_LINES, noteId } from '@/lib/notes';
import { getExercise, isNoteDrillMode } from '@/lib/exercises';
import {
  ALL_QUESTION_KINDS,
  FULL_KEY_GRID,
  displayKeyName,
  getDefaultEnabledKeys,
  keyIdsForTypes,
  QUESTION_KIND_LABEL,
} from '@/lib/fifths';
import { ALL_DEGREES, ALL_QUALITY_SCOPES, displayDegreeOrdinal, QUALITY_SCOPE_LABEL } from '@/lib/intervals';
import { BUILD_DEGREES, getDefaultEnabledRoots } from '@/lib/intervalBuild';
import { ALL_RELATIVE_QUESTION_KINDS, getRelativePair, RELATIVE_QUESTION_KIND_LABEL } from '@/lib/relatives';
import { CHALLENGE_NOTE_OPTIONS, MEASURE_OPTIONS } from '@/lib/sheet';
import { ALL_SCALE_TYPES, displaySpelledNoteName, SCALE_TYPE_LABEL } from '@/lib/scales';
import { Clef, ExerciseConfig, MajorKey, NotePoolConfig, TrainingMode } from '@/lib/types';

interface ExerciseOptionsProps {
  mode: TrainingMode;
  config: ExerciseConfig;
  onChange: (config: ExerciseConfig) => void;
}

const MIN_ENABLED_KEYS = 2;
const MIN_ENABLED_NOTES = 2;
const NOTICE_MS = 2500;

const KEY_PRESETS: { label: string; ids: () => string[] }[] = [
  { label: 'Tutte', ids: getDefaultEnabledKeys },
  { label: 'Solo ♯', ids: () => keyIdsForTypes(['sharp']) },
  { label: 'Solo ♭', ids: () => keyIdsForTypes(['flat']) },
];

const DURATION_OPTIONS = [60, 180, 300, 600, 0];

/** A challenge is always against the clock */
const CHALLENGE_DURATION_OPTIONS = DURATION_OPTIONS.filter((seconds) => seconds > 0);

const ALL_CLEFS: Clef[] = ['treble', 'bass'];

const CLEF_LABEL: Record<Clef, string> = { treble: '🎼 Violino', bass: '𝄢 Basso' };

/**
 * The list with `item` added or taken out — or null when taking it out would leave
 * fewer than `min`, which the caller reports instead of silently doing nothing.
 */
function toggled<T>(list: T[], item: T, min: number): T[] | null {
  if (!list.includes(item)) return [...list, item];
  if (list.length <= min) return null;
  return list.filter((x) => x !== item);
}

/**
 * For a choice of two where one must stay on: switching off the only one left means
 * wanting the other, so it switches over rather than refusing. Kept in `both`'s order.
 */
function toggledEither<T>(list: T[], item: T, both: readonly T[]): T[] {
  if (!list.includes(item)) return both.filter((x) => x === item || list.includes(x));
  const rest = list.filter((x) => x !== item);
  return rest.length > 0 ? rest : both.filter((x) => x !== item);
}

function durationLabel(seconds: number): string {
  return seconds > 0 ? `${seconds / 60} min` : 'Senza limite';
}

/**
 * The settings of one exercise. What decides what the session is like comes first;
 * the fine-grained pools sit under "Altre opzioni", already filled with sensible
 * defaults. Every change is saved as it is made.
 */
export default function ExerciseOptions({ mode, config, onChange }: ExerciseOptionsProps) {
  // A fresh object per refusal, so the same message twice in a row still restarts its timer
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const refuse = (text: string) => setNotice({ text });

  const names = config.nameSystem;

  const durationSection = (seconds: number, set: (seconds: number) => void, options = DURATION_OPTIONS) => (
    <OptionSection title="Durata">
      <div className="flex flex-wrap gap-2">
        {options.map((value) => (
          <Choice key={value} selected={seconds === value} onClick={() => set(value)} className="px-4 py-2">
            {durationLabel(value)}
          </Choice>
        ))}
      </div>
    </OptionSection>
  );

  const clefSection = (clefs: Clef[], set: (clefs: Clef[]) => void) => (
    <OptionSection title="Chiave">
      <div className="flex gap-3">
        {ALL_CLEFS.map((clef) => (
          <Choice
            key={clef}
            selected={clefs.includes(clef)}
            onClick={() => set(toggledEither(clefs, clef, ALL_CLEFS))}
            className="flex-1 py-2"
          >
            {CLEF_LABEL[clef]}
          </Choice>
        ))}
      </div>
    </OptionSection>
  );

  /** The 7×n circle-of-fifths grid of keys, toggled one by one */
  const keyGrid = (enabled: string[], toggle: (id: string) => void, label: (key: MajorKey) => ReactNode, tall = false) => (
    <div className="grid grid-cols-7 gap-1.5">
      {FULL_KEY_GRID.flatMap((row) =>
        row.cells.map((key, column) =>
          key ? (
            <Choice
              key={key.id}
              selected={enabled.includes(key.id)}
              onClick={() => toggle(key.id)}
              muted
              className={tall ? 'h-12 leading-tight' : 'h-10'}
            >
              {label(key)}
            </Choice>
          ) : (
            <div key={`${row.accidental}-${column}`} aria-hidden />
          )
        )
      )}
    </div>
  );

  let primary: ReactNode;
  let advanced: ReactNode;

  if (isNoteDrillMode(mode)) {
    const section = getExercise(mode).section as 'notes' | 'play' | 'notesChallenge' | 'playChallenge';
    const drill: NotePoolConfig = config[section];
    const setDrill = (patch: Partial<NotePoolConfig>) => onChange({ ...config, [section]: { ...config[section], ...patch } });

    const setClefs = (clefs: Clef[]) => {
      // A clef brings its notes in with it, and takes them away when it goes.
      const added = clefs.filter((c) => !drill.clefs.includes(c));
      const removed = drill.clefs.filter((c) => !clefs.includes(c));
      const idsOf = (list: Clef[]) => new Set(list.flatMap((c) => getNotesByClef(c, drill.ledgerLines).map(noteId)));
      const removedIds = idsOf(removed);
      const enabledNotes = [...new Set([...drill.enabledNotes.filter((id) => !removedIds.has(id)), ...idsOf(added)])];
      setDrill({ clefs, enabledNotes });
    };

    const toggleNote = (id: string) => {
      const next = toggled(drill.enabledNotes, id, MIN_ENABLED_NOTES);
      if (next) setDrill({ enabledNotes: next });
      else refuse(`Servono almeno ${MIN_ENABLED_NOTES} note.`);
    };

    const toggleAllClef = (clef: Clef, select: boolean) => {
      const clefNoteIds = getNotesByClef(clef, drill.ledgerLines).map(noteId);
      if (select) {
        setDrill({ enabledNotes: [...new Set([...drill.enabledNotes, ...clefNoteIds])] });
        return;
      }
      const remaining = drill.enabledNotes.filter((id) => !clefNoteIds.includes(id));
      if (remaining.length < MIN_ENABLED_NOTES) refuse(`Servono almeno ${MIN_ENABLED_NOTES} note: togli invece la chiave.`);
      else setDrill({ enabledNotes: remaining });
    };

    /** Widening the range brings its new notes in; narrowing it drops the ones left outside */
    const setLedgerLines = (ledgerLines: number) => {
      const inRange = drill.clefs.flatMap((clef) => getNotesByClef(clef, ledgerLines));
      const added = inRange.filter((n) => n.ledgerLines > drill.ledgerLines).map(noteId);
      const kept = drill.enabledNotes.filter((id) => inRange.some((n) => noteId(n) === id));
      let enabledNotes = [...new Set([...kept, ...added])];
      if (enabledNotes.length < MIN_ENABLED_NOTES) enabledNotes = inRange.map(noteId);
      setDrill({ ledgerLines, enabledNotes });
    };

    let shape: ReactNode;
    if (mode === 'notes' || mode === 'play') {
      const reading = config[mode];
      shape = (
        <OptionSection title="Battute">
          <div className="grid grid-cols-4 gap-2">
            {MEASURE_OPTIONS.map((measures) => (
              <Choice
                key={measures}
                selected={reading.measures === measures}
                onClick={() => onChange({ ...config, [mode]: { ...reading, measures } })}
                className="py-2 leading-tight"
              >
                {measures}
                <span className="block text-xs font-normal">{measures === 1 ? 'battuta' : 'battute'}</span>
              </Choice>
            ))}
          </div>
        </OptionSection>
      );
    } else {
      const challengeSection = mode === 'notes-challenge' ? 'notesChallenge' : 'playChallenge';
      const challenge = config[challengeSection];
      const setChallenge = (patch: Partial<typeof challenge>) =>
        onChange({ ...config, [challengeSection]: { ...challenge, ...patch } });
      shape = (
        <>
          {durationSection(challenge.durationSeconds, (durationSeconds) => setChallenge({ durationSeconds }), CHALLENGE_DURATION_OPTIONS)}
          <OptionSection title="Note alla volta">
            <div className="grid grid-cols-3 gap-2">
              {CHALLENGE_NOTE_OPTIONS.map((notesAtOnce) => (
                <Choice
                  key={notesAtOnce}
                  selected={challenge.notesAtOnce === notesAtOnce}
                  onClick={() => setChallenge({ notesAtOnce })}
                  className="py-2 leading-tight"
                >
                  {notesAtOnce}
                  <span className="block text-xs font-normal">{notesAtOnce === 1 ? 'nota' : 'note'}</span>
                </Choice>
              ))}
            </div>
          </OptionSection>
        </>
      );
    }

    primary = (
      <>
        {shape}
        {clefSection(drill.clefs, setClefs)}

        {(mode === 'play' || mode === 'play-challenge') && (
          <AudioInputSettings
            value={config.audio}
            nameSystem={names}
            onChange={(audio) => onChange({ ...config, audio })}
          />
        )}
      </>
    );

    advanced = (
      <>
        <OptionSection title="Tagli addizionali">
          <div className="flex gap-2">
            {Array.from({ length: MAX_LEDGER_LINES }, (_, i) => i + 1).map((lines) => (
              <Choice key={lines} selected={drill.ledgerLines === lines} onClick={() => setLedgerLines(lines)} className="flex-1 py-2">
                {lines} {lines === 1 ? 'taglio' : 'tagli'}
              </Choice>
            ))}
          </div>
        </OptionSection>

        {drill.clefs.map((clef) => {
          const clefNotes = getNotesByClef(clef, drill.ledgerLines);
          const allSelected = clefNotes.every((n) => drill.enabledNotes.includes(noteId(n)));
          return (
            <OptionSection
              key={clef}
              title={`Note — ${clef === 'treble' ? 'Violino' : 'Basso'}`}
              action={
                <SectionAction onClick={() => toggleAllClef(clef, !allSelected)}>
                  {allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}
                </SectionAction>
              }
            >
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden px-1 py-1">
                <InteractiveStaff
                  notes={clefNotes}
                  clef={clef}
                  enabledNotes={new Set(drill.enabledNotes)}
                  onToggleNote={toggleNote}
                  nameSystem={names}
                  showClef={false}
                />
              </div>
            </OptionSection>
          );
        })}
      </>
    );
  } else if (mode === 'fifths') {
    const fifths = config.fifths;
    const set = (patch: Partial<typeof fifths>) => onChange({ ...config, fifths: { ...fifths, ...patch } });

    primary = (
      <>
        {durationSection(fifths.durationSeconds, (durationSeconds) => set({ durationSeconds }))}
        <OptionSection title="Domande">
          <div className="flex flex-col gap-2">
            {ALL_QUESTION_KINDS.map((kind) => (
              <ChoiceCard
                key={kind}
                selected={fifths.questionKinds.includes(kind)}
                onClick={() => set({ questionKinds: toggledEither(fifths.questionKinds, kind, ALL_QUESTION_KINDS) })}
                title={QUESTION_KIND_LABEL[kind]}
              />
            ))}
          </div>
        </OptionSection>
      </>
    );
    advanced = (
      <>
        {clefSection(fifths.clefs, (clefs) => set({ clefs }))}
        <OptionSection
          title="Tonalità in esercizio"
          action={
            <div className="flex gap-3">
              {KEY_PRESETS.map((preset) => (
                <SectionAction key={preset.label} onClick={() => set({ enabledKeys: preset.ids() })}>
                  {preset.label}
                </SectionAction>
              ))}
            </div>
          }
        >
          {keyGrid(
            fifths.enabledKeys,
            (id) => {
              const next = toggled(fifths.enabledKeys, id, MIN_ENABLED_KEYS);
              if (next) set({ enabledKeys: next });
              else refuse(`Servono almeno ${MIN_ENABLED_KEYS} tonalità.`);
            },
            (key) => displayKeyName(key, names)
          )}
        </OptionSection>
      </>
    );
  } else if (mode === 'relatives') {
    const relatives = config.relatives;
    const set = (patch: Partial<typeof relatives>) => onChange({ ...config, relatives: { ...relatives, ...patch } });

    primary = (
      <>
        {durationSection(relatives.durationSeconds, (durationSeconds) => set({ durationSeconds }))}
        <OptionSection title="Da dove partire">
          <div className="flex flex-col gap-2">
            {ALL_RELATIVE_QUESTION_KINDS.map((kind) => (
              <ChoiceCard
                key={kind}
                selected={relatives.questionKinds.includes(kind)}
                onClick={() =>
                  set({ questionKinds: toggledEither(relatives.questionKinds, kind, ALL_RELATIVE_QUESTION_KINDS) })
                }
                title={RELATIVE_QUESTION_KIND_LABEL[kind]}
              />
            ))}
          </div>
        </OptionSection>
      </>
    );
    advanced = (
      <OptionSection
        title="Coppie in esercizio"
        action={<SectionAction onClick={() => set({ enabledKeys: getDefaultEnabledKeys() })}>Tutte</SectionAction>}
      >
        {keyGrid(
          relatives.enabledKeys,
          (id) => {
            const next = toggled(relatives.enabledKeys, id, MIN_ENABLED_KEYS);
            if (next) set({ enabledKeys: next });
            else refuse(`Servono almeno ${MIN_ENABLED_KEYS} coppie.`);
          },
          (key) => {
            const pair = getRelativePair(key.id);
            return (
              pair && (
                <>
                  <span className="block text-xs font-semibold">{displaySpelledNoteName(pair.major, names)}</span>
                  <span className="block text-[10px] opacity-70">{displaySpelledNoteName(pair.minor, names)}</span>
                </>
              )
            );
          },
          true
        )}
      </OptionSection>
    );
  } else if (mode === 'intervals') {
    const intervals = config.intervals;
    const set = (patch: Partial<typeof intervals>) => onChange({ ...config, intervals: { ...intervals, ...patch } });

    primary = (
      <>
        {durationSection(intervals.durationSeconds, (durationSeconds) => set({ durationSeconds }))}
        <OptionSection title="Qualità">
          <div className="flex flex-col gap-2">
            {ALL_QUALITY_SCOPES.map((scope) => (
              <ChoiceCard
                key={scope}
                selected={intervals.qualityScope === scope}
                onClick={() => set({ qualityScope: scope })}
                title={QUALITY_SCOPE_LABEL[scope]}
              />
            ))}
          </div>
        </OptionSection>
        <OptionSection title="Come vedi le due note">
          <div className="flex gap-3">
            {(['staff', 'letters'] as const).map((presentation) => (
              <Choice
                key={presentation}
                selected={intervals.presentation === presentation}
                onClick={() => set({ presentation })}
                className="flex-1 py-2"
              >
                {presentation === 'staff' ? 'Sul pentagramma' : 'Per nome'}
              </Choice>
            ))}
          </div>
        </OptionSection>
      </>
    );
    advanced = (
      <>
        {intervals.presentation === 'staff' && clefSection(intervals.clefs, (clefs) => set({ clefs }))}
        <OptionSection title="Gradi">
          <div className="grid grid-cols-7 gap-1.5">
            {ALL_DEGREES.map((degree) => (
              <Choice
                key={degree}
                selected={intervals.enabledDegrees.includes(degree)}
                onClick={() => {
                  const next = toggled(intervals.enabledDegrees, degree, 1);
                  if (next) set({ enabledDegrees: next.sort((a, b) => a - b) });
                  else refuse('Serve almeno un grado.');
                }}
                muted
                className="h-10"
              >
                {displayDegreeOrdinal(degree)}
              </Choice>
            ))}
          </div>
        </OptionSection>
      </>
    );
  } else if (mode === 'interval-build') {
    const build = config.intervalBuild;
    const set = (patch: Partial<typeof build>) => onChange({ ...config, intervalBuild: { ...build, ...patch } });

    primary = (
      <>
        {durationSection(build.durationSeconds, (durationSeconds) => set({ durationSeconds }))}
        <OptionSection title="Qualità">
          <div className="flex flex-col gap-2">
            {ALL_QUALITY_SCOPES.map((scope) => (
              <ChoiceCard
                key={scope}
                selected={build.qualityScope === scope}
                onClick={() => set({ qualityScope: scope })}
                title={QUALITY_SCOPE_LABEL[scope]}
              />
            ))}
          </div>
        </OptionSection>
      </>
    );
    advanced = (
      <>
        {/* No octave: its target would be the root note itself */}
        <OptionSection title="Gradi">
          <div className="grid grid-cols-6 gap-1.5">
            {BUILD_DEGREES.map((degree) => (
              <Choice
                key={degree}
                selected={build.enabledDegrees.includes(degree)}
                onClick={() => {
                  const next = toggled(build.enabledDegrees, degree, 1);
                  if (next) set({ enabledDegrees: next.sort((a, b) => a - b) });
                  else refuse('Serve almeno un grado.');
                }}
                muted
                className="h-10"
              >
                {displayDegreeOrdinal(degree)}
              </Choice>
            ))}
          </div>
        </OptionSection>
        <OptionSection
          title="Note di partenza"
          action={<SectionAction onClick={() => set({ enabledRoots: getDefaultEnabledRoots() })}>Tutte</SectionAction>}
        >
          {keyGrid(
            build.enabledRoots,
            (id) => {
              const next = toggled(build.enabledRoots, id, MIN_ENABLED_KEYS);
              if (next) set({ enabledRoots: next });
              else refuse(`Servono almeno ${MIN_ENABLED_KEYS} note di partenza.`);
            },
            (key) => displayKeyName(key, names)
          )}
        </OptionSection>
      </>
    );
  } else {
    const scales = config.scales;
    const set = (patch: Partial<typeof scales>) => onChange({ ...config, scales: { ...scales, ...patch } });

    primary = (
      <>
        {durationSection(scales.durationSeconds, (durationSeconds) => set({ durationSeconds }))}
        <OptionSection title="Tipi di scala">
          <div className="flex flex-col gap-2">
            {ALL_SCALE_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                selected={scales.enabledTypes.includes(type)}
                onClick={() => {
                  const next = toggled(scales.enabledTypes, type, 1);
                  if (next) set({ enabledTypes: ALL_SCALE_TYPES.filter((t) => next.includes(t)) });
                  else refuse('Serve almeno un tipo di scala.');
                }}
                title={SCALE_TYPE_LABEL[type]}
              />
            ))}
          </div>
        </OptionSection>
      </>
    );
    advanced = (
      <OptionSection
        title="Toniche"
        action={<SectionAction onClick={() => set({ enabledTonics: getDefaultEnabledKeys() })}>Tutte</SectionAction>}
      >
        {keyGrid(
          scales.enabledTonics,
          (id) => {
            const next = toggled(scales.enabledTonics, id, 2);
            if (next) set({ enabledTonics: next });
            else refuse('Servono almeno 2 toniche.');
          },
          (key) => displayKeyName(key, names)
        )}
      </OptionSection>
    );
  }

  return (
    <div className="space-y-6">
      {primary}

      <details className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
          Altre opzioni
          <span aria-hidden className="text-zinc-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-4 pb-4 space-y-6">{advanced}</div>
      </details>

      {/* Taps the rules turn down say why, instead of looking broken */}
      <p role="status" aria-live="polite" className="sticky bottom-24 z-10 text-center pointer-events-none">
        {notice && (
          <span className="inline-block rounded-xl bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-2 text-sm font-semibold shadow-lg">
            {notice.text}
          </span>
        )}
      </p>
    </div>
  );
}
