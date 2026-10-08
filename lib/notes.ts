import { STAFF_STEPS } from './staff.ts';
import type { AccidentalSign, Clef, Note, NoteNameSystem } from './types.ts';

/** How many ledger lines the note picker can reach above and below the staff */
export const MAX_LEDGER_LINES = 3;

/** The range a fresh configuration practises: the staff plus one ledger line each way */
export const DEFAULT_LEDGER_LINES = 1;

/**
 * How many ledger lines past the staff a range has to reach to take in the note `step`
 * positions above the bottom line. A note hanging just past a ledger line belongs with
 * the next one out, so one ledger line means C4–A5 in treble, as written on the lines.
 */
export function ledgerLinesAt(step: number): number {
  if (step < 0) return Math.ceil(-step / 2);
  if (step > 8) return Math.ceil((step - 8) / 2);
  return 0;
}

/**
 * Every note of a clef from MAX_LEDGER_LINES below the staff to as many above it,
 * lowest first — treble F3–E6, bass A1–G4.
 */
function clefNotes(clef: Clef): Note[] {
  return Object.entries(STAFF_STEPS[clef])
    .sort(([, a], [, b]) => a - b)
    .map(([vexKey, step]) => {
      const [letter, octave] = vexKey.split('/');
      return { vexKey, octave: Number(octave), letter: letter.toUpperCase(), clef, ledgerLines: ledgerLinesAt(step) };
    });
}

export const ALL_NOTES: Note[] = [...clefNotes('treble'), ...clefNotes('bass')];

/** The notes of a clef that need at most `maxLedgerLines` ledger lines */
export function getNotesByClef(clef: Clef, maxLedgerLines = MAX_LEDGER_LINES): Note[] {
  return ALL_NOTES.filter((n) => n.clef === clef && n.ledgerLines <= maxLedgerLines);
}

export function getNoteByKey(vexKey: string, clef: Clef): Note | undefined {
  return ALL_NOTES.find((n) => n.vexKey === vexKey && n.clef === clef);
}

export function getDefaultEnabledNotes(clefs: Clef[], maxLedgerLines = DEFAULT_LEDGER_LINES): string[] {
  return clefs.flatMap((clef) => getNotesByClef(clef, maxLedgerLines)).map(noteId);
}

/** Unique note ID combining vexKey and clef (same pitch can appear in both clefs) */
export function noteId(note: Note): string {
  return `${note.vexKey}|${note.clef}`;
}

const ITALIAN: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};

export function displayNoteName(letter: string, system: NoteNameSystem): string {
  return system === 'italian' ? ITALIAN[letter] : letter;
}

export const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

export const SHARP = '♯';
export const FLAT = '♭';

export const ACCIDENTAL_SIGN_SYMBOL: Record<AccidentalSign, string> = {
  '': '',
  '#': SHARP,
  b: FLAT,
};

/** Note name plus its written accidental, e.g. "Fa♯" (italian) or "F♯" (english). */
export function displaySpelledNote(letter: string, sign: AccidentalSign, system: NoteNameSystem): string {
  return displayNoteName(letter, system) + ACCIDENTAL_SIGN_SYMBOL[sign];
}

/** Semitone of each natural note within an octave, C = 0. */
export const LETTER_BASE_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** How much a written accidental shifts the pitch. */
export const SIGN_SEMITONE: Record<AccidentalSign, number> = { '': 0, '#': 1, b: -1 };

/** MIDI number of a written note, e.g. "c/4" (middle C) is 60. */
export function writtenMidi(note: Note): number {
  return (note.octave + 1) * 12 + LETTER_BASE_SEMITONE[note.letter];
}
