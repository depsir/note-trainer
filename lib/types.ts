export type Clef = 'treble' | 'bass';

export type NoteNameSystem = 'italian' | 'english';

/**
 * `notes` and `play` read a written piece through, answered by name or on the instrument;
 * their `-challenge` twins read against the clock, as many notes as there is time for.
 */
export type TrainingMode =
  | 'notes'
  | 'play'
  | 'notes-challenge'
  | 'play-challenge'
  | 'fifths'
  | 'relatives'
  | 'intervals'
  | 'interval-build'
  | 'scales';

/** The note-reading exercises, which all draw from a pool of notes on the staff */
export type NoteDrillMode = Extract<TrainingMode, 'notes' | 'play' | 'notes-challenge' | 'play-challenge'>;

export type AccidentalType = 'none' | 'sharp' | 'flat';

/** An accidental as it is written in a note name: sharp, flat, or nothing. */
export type AccidentalSign = '' | '#' | 'b';

/** The four scale shapes this app drills */
export type ScaleType = 'major' | 'minor-natural' | 'minor-harmonic' | 'minor-melodic';

/** Instruments the microphone input knows how to listen to — see lib/instruments.ts */
export type InstrumentId = 'guitar' | 'clarinet-bb' | 'concert';

/** Which way round a circle-of-fifths question is asked */
export type FifthsQuestionKind = 'signature-to-key' | 'key-to-count';

/** Which end of a relative pair a question starts from */
export type RelativeQuestionKind = 'major-to-minor' | 'minor-to-major';

/** Interval quality; not every value applies to every degree — see lib/intervals.ts */
export type IntervalQuality = 'diminished' | 'minor' | 'perfect' | 'major' | 'augmented';

/** How an interval question is presented: two notes on the staff, or their letter names */
export type IntervalPresentation = 'staff' | 'letters';

/** Which interval qualities get asked: only perfect/major, or every quality */
export type IntervalQualityScope = 'default' | 'all';

export interface MajorKey {
  /** Stable id, also the VexFlow key spec, e.g. "F#" */
  id: string;
  /** Letter name A-G */
  letter: string;
  /** Accidental in the key name */
  accidental: AccidentalSign;
  /** How many accidentals the key signature carries, 0-7 */
  count: number;
  /** Which kind of accidental the signature uses */
  type: AccidentalType;
}

export interface Note {
  /** VexFlow key string, e.g. "c/4" */
  vexKey: string;
  /** Octave number */
  octave: number;
  /** Letter name A-G */
  letter: string;
  /** Which clef this note belongs to */
  clef: Clef;
  /** How many ledger lines past the staff a range must reach to include it — see ledgerLinesAt */
  ledgerLines: number;
}

export interface NoteStats {
  correct: number;
  wrong: number;
  /** Weight for adaptive selection (higher = shown more often) */
  weight: number;
  /** Sum of response times for correct answers considered by the adaptive algorithm */
  correctResponseTimeTotalMs: number;
  /** Number of correct answers whose response time was considered */
  timedCorrectResponses: number;
}

export type AllNoteStats = Record<string, NoteStats>;

/** What every exercise has: how long a session lasts. */
interface TimedConfig {
  /** Duration in seconds; 0 = no clock */
  durationSeconds: number;
}

/** Which notes a note-reading exercise draws from */
export interface NotePoolConfig {
  /** Which clefs to include */
  clefs: Clef[];
  /** Note vexKeys to include (subset of all available) */
  enabledNotes: string[];
  /** How many ledger lines above and below the staff the note picker reaches, 1 to MAX_LEDGER_LINES */
  ledgerLines: number;
}

/** Reading one written piece through, with no clock */
export interface SheetReadingConfig extends NotePoolConfig {
  /** How many 4/4 bars the piece spans */
  measures: number;
}

/** Reading as many notes as there is time for */
export interface NoteChallengeConfig extends NotePoolConfig, TimedConfig {
  /** Notes on screen at once: a single note, or a bar or two of a written piece */
  notesAtOnce: number;
}

export interface FifthsConfig extends TimedConfig {
  /** Which question kinds to ask */
  questionKinds: FifthsQuestionKind[];
  /** Major key ids to include (subset of MAJOR_KEYS) */
  enabledKeys: string[];
  /** Clefs the key signatures are drawn in */
  clefs: Clef[];
}

export interface RelativesConfig extends TimedConfig {
  /** Which directions to ask */
  questionKinds: RelativeQuestionKind[];
  /** Relative pair ids to include — the ids are those of the major keys */
  enabledKeys: string[];
}

export interface IntervalsConfig extends TimedConfig {
  /** Interval numbers to include (subset of 2-8) */
  enabledDegrees: number[];
  /** How the question is displayed */
  presentation: IntervalPresentation;
  /** Whether minor/diminished/augmented qualities are asked too */
  qualityScope: IntervalQualityScope;
  /** Clefs the two notes are drawn in, when shown on the staff */
  clefs: Clef[];
}

export interface IntervalBuildConfig extends TimedConfig {
  /** Interval numbers to include (subset of BUILD_DEGREES) */
  enabledDegrees: number[];
  /** Whether minor/diminished/augmented qualities are asked too */
  qualityScope: IntervalQualityScope;
  /** Root note ids to include (subset of ALL_BUILD_ROOT_IDS) */
  enabledRoots: string[];
}

export interface AudioInputConfig {
  /** Which instrument is being played; decides how written notes are transposed */
  instrument: InstrumentId;
  /** Chosen input device; empty means the system default */
  deviceId: string;
  /** Concert pitch the heard notes are named against */
  a4: number;
  /** Require the written octave too, not just the note name */
  strictOctave: boolean;
}

export interface ScalesConfig extends TimedConfig {
  /** Which scale shapes to ask */
  enabledTypes: ScaleType[];
  /** Tonic ids to include (subset of ALL_TONIC_IDS) */
  enabledTonics: string[];
}

/**
 * Everything the app remembers between visits. Each exercise keeps its own section, so
 * setting up one never changes another; only the note names and the instrument are shared.
 */
export interface ExerciseConfig {
  /** Note name display system */
  nameSystem: NoteNameSystem;
  /** Reading a piece and answering by name */
  notes: SheetReadingConfig;
  /** Reading a piece and answering on the instrument */
  play: SheetReadingConfig;
  /** Reading against the clock and answering by name */
  notesChallenge: NoteChallengeConfig;
  /** Reading against the clock and answering on the instrument */
  playChallenge: NoteChallengeConfig;
  /** Circle-of-fifths mode settings */
  fifths: FifthsConfig;
  /** Relative major/minor mode settings */
  relatives: RelativesConfig;
  /** Interval training mode settings */
  intervals: IntervalsConfig;
  /** Interval-building mode settings */
  intervalBuild: IntervalBuildConfig;
  /** Scale training mode settings */
  scales: ScalesConfig;
  /** Instrument / microphone input settings, used by the exercises answered on the instrument */
  audio: AudioInputConfig;
}

export interface SessionResult {
  noteKey: string;
  correct: boolean;
  attempts: number;
  timestamp: number;
}
