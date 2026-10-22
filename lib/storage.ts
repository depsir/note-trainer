'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useHydrated } from './client.ts';
import type {
  AllNoteStats,
  Clef,
  ExerciseConfig,
  NoteChallengeConfig,
  NotePoolConfig,
  SheetReadingConfig,
} from './types.ts';
import { ALL_NOTES, DEFAULT_LEDGER_LINES, getDefaultEnabledNotes, noteId } from './notes.ts';
import { ALL_QUESTION_KINDS, getDefaultEnabledKeys } from './fifths.ts';
import { ALL_RELATIVE_QUESTION_KINDS } from './relatives.ts';
import { getDefaultEnabledDegrees } from './intervals.ts';
import { getDefaultBuildDegrees, getDefaultEnabledRoots } from './intervalBuild.ts';
import { ALL_SCALE_TYPES, getDefaultEnabledTonics } from './scales.ts';
import { DEFAULT_CHALLENGE_NOTES, DEFAULT_MEASURES, normalizeMeasures, normalizeNotesAtOnce, sheetNoteCount } from './sheet.ts';
import { DEFAULT_A4 } from './pitch.ts';

const STATS_KEY = 'note-coach-stats';
const CONFIG_KEY = 'note-coach-config';
const STORAGE_EVENT = 'note-coach-storage';
const EMPTY_STATS: AllNoteStats = {};

const DEFAULT_DURATION = 3 * 60;

function defaultPool(clefs: Clef[]): NotePoolConfig {
  return { clefs, enabledNotes: getDefaultEnabledNotes(clefs), ledgerLines: DEFAULT_LEDGER_LINES };
}

function defaultReading(clefs: Clef[]): SheetReadingConfig {
  return { ...defaultPool(clefs), measures: DEFAULT_MEASURES };
}

function defaultChallenge(clefs: Clef[]): NoteChallengeConfig {
  return { ...defaultPool(clefs), durationSeconds: DEFAULT_DURATION, notesAtOnce: DEFAULT_CHALLENGE_NOTES };
}

const DEFAULT_CONFIG: ExerciseConfig = {
  nameSystem: 'italian',
  notes: defaultReading(['treble', 'bass']),
  // An instrument reads one clef far more often than both
  play: defaultReading(['treble']),
  notesChallenge: defaultChallenge(['treble', 'bass']),
  playChallenge: defaultChallenge(['treble']),
  fifths: {
    durationSeconds: DEFAULT_DURATION,
    questionKinds: [...ALL_QUESTION_KINDS],
    enabledKeys: getDefaultEnabledKeys(),
    clefs: ['treble', 'bass'],
  },
  relatives: {
    durationSeconds: DEFAULT_DURATION,
    questionKinds: [...ALL_RELATIVE_QUESTION_KINDS],
    enabledKeys: getDefaultEnabledKeys(),
  },
  intervals: {
    durationSeconds: DEFAULT_DURATION,
    enabledDegrees: getDefaultEnabledDegrees(),
    presentation: 'staff',
    qualityScope: 'all',
    clefs: ['treble', 'bass'],
  },
  intervalBuild: {
    durationSeconds: DEFAULT_DURATION,
    enabledDegrees: getDefaultBuildDegrees(),
    qualityScope: 'default',
    enabledRoots: getDefaultEnabledRoots(),
  },
  scales: {
    durationSeconds: DEFAULT_DURATION,
    enabledTypes: [...ALL_SCALE_TYPES],
    enabledTonics: getDefaultEnabledTonics(),
  },
  audio: {
    // The guitar is what the input was built for; a config saved before this
    // setting existed came from one, so it is also the right fallback.
    instrument: 'guitar',
    deviceId: '',
    a4: DEFAULT_A4,
    strictOctave: false,
  },
};

/**
 * The shape saved before each exercise had its own settings: one duration, one set of
 * clefs and one note pool for everything, with sheet reading and the microphone as
 * switches on note reading. Two interval modes, merged since, may also still be there.
 */
interface LegacyConfig {
  mode?: string;
  durationSeconds?: number;
  clefs?: Clef[];
  enabledNotes?: string[];
  ledgerLines?: number;
  sheet?: { enabled?: boolean; measures?: number };
  intervals?: Partial<ExerciseConfig['intervals']>;
}

/**
 * Note reading before the timed challenge was an exercise of its own: one note at a time
 * or a piece, with or without a clock.
 */
interface LegacyNoteDrill {
  view?: 'single' | 'sheet';
  durationSeconds?: number;
}

type SavedConfig = { [K in keyof ExerciseConfig]?: Partial<ExerciseConfig[K]> } & LegacyConfig & {
  notes?: LegacyNoteDrill;
  play?: LegacyNoteDrill;
};

type SavedNoteDrill = Partial<SheetReadingConfig> & LegacyNoteDrill;

/** Spreads what was saved under the old flat shape into the sections that now hold it. */
function migrateLegacy(saved: SavedConfig): SavedConfig {
  if (saved.notes) return saved;

  const shared = {
    ...(saved.durationSeconds !== undefined && { durationSeconds: saved.durationSeconds }),
  };
  const clefs = saved.clefs && { clefs: saved.clefs };
  const drill: SavedNoteDrill = {
    ...shared,
    ...clefs,
    ...(saved.enabledNotes && { enabledNotes: saved.enabledNotes }),
    ...(saved.ledgerLines !== undefined && { ledgerLines: saved.ledgerLines }),
    ...(saved.sheet?.measures !== undefined && { measures: saved.sheet.measures }),
    view: saved.sheet?.enabled ? 'sheet' : 'single',
  };
  const legacyScope =
    saved.mode === 'intervals-major' ? 'default' : saved.mode === 'intervals-any' ? 'all' : undefined;

  return {
    ...saved,
    notes: drill,
    play: drill,
    fifths: { ...saved.fifths, ...shared, ...clefs },
    relatives: { ...saved.relatives, ...shared },
    intervals: { ...saved.intervals, ...shared, ...clefs, ...(legacyScope && { qualityScope: legacyScope }) },
    intervalBuild: { ...saved.intervalBuild, ...shared },
    scales: { ...saved.scales, ...shared },
  };
}

/** The challenge a reader of the old note reading gets: the same notes, as many at once, the same clock. */
function challengeFromDrill(drill: SavedNoteDrill | undefined): Partial<NoteChallengeConfig> | undefined {
  if (!drill) return undefined;
  const { view, measures, durationSeconds, ...pool } = drill;
  return {
    ...pool,
    ...(durationSeconds && { durationSeconds }),
    ...(view && { notesAtOnce: view === 'sheet' ? sheetNoteCount(measures ?? DEFAULT_MEASURES) : 1 }),
  };
}

function resolvePool(merged: NotePoolConfig): NotePoolConfig {
  return { clefs: merged.clefs, enabledNotes: merged.enabledNotes, ledgerLines: merged.ledgerLines };
}

// Built field by field, so what the old note reading kept (its view, its clock) is left behind.
function resolveReading(saved: SavedNoteDrill | undefined, fallback: SheetReadingConfig): SheetReadingConfig {
  const merged = { ...fallback, ...saved };
  return { ...resolvePool(merged), measures: normalizeMeasures(merged.measures) };
}

function resolveChallenge(
  saved: Partial<NoteChallengeConfig> | undefined,
  fallback: NoteChallengeConfig
): NoteChallengeConfig {
  const merged = { ...fallback, ...saved };
  return {
    ...resolvePool(merged),
    // A challenge is always against the clock
    durationSeconds: merged.durationSeconds > 0 ? merged.durationSeconds : fallback.durationSeconds,
    notesAtOnce: normalizeNotesAtOnce(merged.notesAtOnce),
  };
}

function resolveConfig(raw: SavedConfig): ExerciseConfig {
  const saved = migrateLegacy(raw);
  return {
    nameSystem: saved.nameSystem ?? DEFAULT_CONFIG.nameSystem,
    // Each section merges on its own, so configs saved before a field existed still get its default.
    notes: resolveReading(saved.notes, DEFAULT_CONFIG.notes),
    play: resolveReading(saved.play, DEFAULT_CONFIG.play),
    notesChallenge: resolveChallenge(saved.notesChallenge ?? challengeFromDrill(saved.notes), DEFAULT_CONFIG.notesChallenge),
    playChallenge: resolveChallenge(saved.playChallenge ?? challengeFromDrill(saved.play), DEFAULT_CONFIG.playChallenge),
    fifths: { ...DEFAULT_CONFIG.fifths, ...saved.fifths },
    relatives: { ...DEFAULT_CONFIG.relatives, ...saved.relatives },
    intervals: { ...DEFAULT_CONFIG.intervals, ...saved.intervals },
    intervalBuild: { ...DEFAULT_CONFIG.intervalBuild, ...saved.intervalBuild },
    scales: { ...DEFAULT_CONFIG.scales, ...saved.scales },
    audio: { ...DEFAULT_CONFIG.audio, ...saved.audio },
  };
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent<string>(STORAGE_EVENT, { detail: key }));
}

let cachedStatsRaw: string | null | undefined;
let cachedStatsValue: AllNoteStats = EMPTY_STATS;
let cachedConfigRaw: string | null | undefined;
let cachedConfigValue: ExerciseConfig = DEFAULT_CONFIG;

function subscribeToStorage(targetKey: string) {
  return (onStoreChange: () => void) => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleChange = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key && event.key !== targetKey) return;
      } else if (event instanceof CustomEvent && event.detail !== targetKey) {
        return;
      }

      onStoreChange();
    };

    window.addEventListener('storage', handleChange);
    window.addEventListener(STORAGE_EVENT, handleChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(STORAGE_EVENT, handleChange as EventListener);
    };
  };
}

function getStatsSnapshot() {
  if (typeof window === 'undefined') return EMPTY_STATS;

  const raw = localStorage.getItem(STATS_KEY);
  if (raw === cachedStatsRaw) return cachedStatsValue;

  cachedStatsRaw = raw;
  cachedStatsValue = raw ? loadJSON<AllNoteStats>(STATS_KEY, EMPTY_STATS) : EMPTY_STATS;
  return cachedStatsValue;
}

function getConfigSnapshot() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  const raw = localStorage.getItem(CONFIG_KEY);
  if (raw === cachedConfigRaw) return cachedConfigValue;

  cachedConfigRaw = raw;
  cachedConfigValue = raw ? resolveConfig(loadJSON<SavedConfig>(CONFIG_KEY, {})) : DEFAULT_CONFIG;
  return cachedConfigValue;
}

export function useNoteStats() {
  const hydrated = useHydrated();
  const stats = useSyncExternalStore(subscribeToStorage(STATS_KEY), getStatsSnapshot, () => EMPTY_STATS);
  const config = useSyncExternalStore(subscribeToStorage(CONFIG_KEY), getConfigSnapshot, () => DEFAULT_CONFIG);

  const updateStats = useCallback((newStats: AllNoteStats) => {
    saveJSON(STATS_KEY, newStats);
  }, []);

  const updateConfig = useCallback((newConfig: ExerciseConfig) => {
    saveJSON(CONFIG_KEY, newConfig);
  }, []);

  const resetStats = useCallback(() => {
    saveJSON(STATS_KEY, EMPTY_STATS);
  }, []);

  const getAllNoteIds = useCallback(() => {
    return ALL_NOTES.map((n) => noteId(n));
  }, []);

  return { stats, config, hydrated, updateStats, updateConfig, resetStats, getAllNoteIds };
}
