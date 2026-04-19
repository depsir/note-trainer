export type Clef = 'treble' | 'bass';

export type NoteNameSystem = 'italian' | 'english';

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
}

export type AllNoteStats = Record<string, NoteStats>;

export interface ExerciseConfig {
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
}

export interface SessionResult {
  noteKey: string;
  correct: boolean;
  attempts: number;
  timestamp: number;
}
