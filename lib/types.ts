export type Clef = 'treble' | 'bass';

export type NoteNameSystem = 'italian' | 'english';

export type TrainingMode = 'notes' | 'fifths' | 'intervals-major' | 'intervals-any';

export type AccidentalType = 'none' | 'sharp' | 'flat';

/** Which way round a circle-of-fifths question is asked */
export type FifthsQuestionKind = 'signature-to-key' | 'key-to-count';

/** Interval quality; not every value applies to every degree — see lib/intervals.ts */
export type IntervalQuality = 'diminished' | 'minor' | 'perfect' | 'major' | 'augmented';

/** How an interval question is presented: two notes on the staff, or their letter names */
export type IntervalPresentation = 'staff' | 'letters';

export interface MajorKey {
  /** Stable id, also the VexFlow key spec, e.g. "F#" */
  id: string;
  /** Letter name A-G */
  letter: string;
  /** Accidental in the key name */
  accidental: '' | '#' | 'b';
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
  /** Whether it needs a ledger line */
  isLedger: boolean;
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

export interface FifthsConfig {
  /** Which question kinds to ask */
  questionKinds: FifthsQuestionKind[];
  /** Major key ids to include (subset of MAJOR_KEYS) */
  enabledKeys: string[];
}

export interface IntervalsConfig {
  /** Interval numbers to include (subset of 2-8) */
  enabledDegrees: number[];
  /** How the question is displayed */
  presentation: IntervalPresentation;
}

export interface ExerciseConfig {
  /** Which exercise the trainer runs */
  mode: TrainingMode;
  /** Duration in seconds; 0 = unlimited */
  durationSeconds: number;
  /** Which clefs to include */
  clefs: Clef[];
  /** Note vexKeys to include (subset of all available) */
  enabledNotes: string[];
  /** Use adaptive weighting */
  useAdaptive: boolean;
  /** Note name display system */
  nameSystem: NoteNameSystem;
  /** Circle-of-fifths mode settings */
  fifths: FifthsConfig;
  /** Interval training mode settings */
  intervals: IntervalsConfig;
}

export interface SessionResult {
  noteKey: string;
  correct: boolean;
  attempts: number;
  timestamp: number;
}
