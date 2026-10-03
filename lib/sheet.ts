import { pickNote } from './adaptive.ts';
import { noteId } from './notes.ts';
import type { AllNoteStats, Clef, Note } from './types.ts';

/** The piece is written in 4/4 and spelled entirely in quarter notes. */
export const BEATS_PER_MEASURE = 4;

/** Bar counts the settings offer */
export const MEASURE_OPTIONS = [2, 4, 8, 16] as const;

export const DEFAULT_MEASURES = 4;

export interface Sheet {
  /** The clef the whole piece is written in — a piece does not change clef mid-way */
  clef: Clef;
  /** Every note of the piece, in reading order */
  notes: Note[];
  /** How many bars it spans */
  measures: number;
}

/** How many notes a piece of this many bars holds. */
export function sheetNoteCount(measures: number): number {
  return normalizeMeasures(measures) * BEATS_PER_MEASURE;
}

/** Keeps a stored or hand-edited bar count inside what the settings offer. */
export function normalizeMeasures(measures: number): number {
  if (!Number.isFinite(measures)) return DEFAULT_MEASURES;
  const rounded = Math.round(measures);
  const first = MEASURE_OPTIONS[0];
  const last = MEASURE_OPTIONS[MEASURE_OPTIONS.length - 1];
  return Math.min(last, Math.max(first, rounded));
}

/**
 * Writes out a piece to read.
 *
 * The clef is drawn once at the front, so the whole piece has to live in a single
 * one: the clef is picked first, among those the enabled notes actually cover, and
 * the notes come from that clef alone. Picking note by note — rather than shuffling
 * a pool — is what keeps adaptive weighting, and its no-immediate-repeat rule,
 * working the same way it does one note at a time.
 */
export function buildSheet(
  candidates: Note[],
  stats: AllNoteStats,
  useAdaptive: boolean,
  measures: number
): Sheet {
  if (candidates.length === 0) throw new Error('No candidate notes');

  const clefs = [...new Set(candidates.map((note) => note.clef))] as Clef[];
  const clef = clefs[Math.floor(Math.random() * clefs.length)];
  const pool = candidates.filter((note) => note.clef === clef);

  const barCount = normalizeMeasures(measures);
  const notes: Note[] = [];
  let lastId: string | undefined;
  for (let i = 0; i < barCount * BEATS_PER_MEASURE; i++) {
    const note = pickNote(pool, stats, useAdaptive, lastId);
    lastId = noteId(note);
    notes.push(note);
  }

  return { clef, notes, measures: barCount };
}

/** 1-based bar number of the note at `index`, for a progress readout. */
export function measureOf(index: number): number {
  return Math.floor(index / BEATS_PER_MEASURE) + 1;
}
