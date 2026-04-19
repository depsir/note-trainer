import { Note, Clef } from './types';

/** All notes in treble clef: staff (E4–F5) + 1 ledger line above/below */
const TREBLE_NOTES: Note[] = [
  // 1 ledger line below
  { vexKey: 'c/4', octave: 4, letter: 'C', clef: 'treble', isLedger: true },
  { vexKey: 'd/4', octave: 4, letter: 'D', clef: 'treble', isLedger: true },
  // on staff
  { vexKey: 'e/4', octave: 4, letter: 'E', clef: 'treble', isLedger: false },
  { vexKey: 'f/4', octave: 4, letter: 'F', clef: 'treble', isLedger: false },
  { vexKey: 'g/4', octave: 4, letter: 'G', clef: 'treble', isLedger: false },
  { vexKey: 'a/4', octave: 4, letter: 'A', clef: 'treble', isLedger: false },
  { vexKey: 'b/4', octave: 4, letter: 'B', clef: 'treble', isLedger: false },
  { vexKey: 'c/5', octave: 5, letter: 'C', clef: 'treble', isLedger: false },
  { vexKey: 'd/5', octave: 5, letter: 'D', clef: 'treble', isLedger: false },
  { vexKey: 'e/5', octave: 5, letter: 'E', clef: 'treble', isLedger: false },
  { vexKey: 'f/5', octave: 5, letter: 'F', clef: 'treble', isLedger: false },
  // 1 ledger line above
  { vexKey: 'g/5', octave: 5, letter: 'G', clef: 'treble', isLedger: true },
  { vexKey: 'a/5', octave: 5, letter: 'A', clef: 'treble', isLedger: true },
];

/** All notes in bass clef: staff (G2–A3) + 1 ledger line above/below */
const BASS_NOTES: Note[] = [
  // 1 ledger line below
  { vexKey: 'e/2', octave: 2, letter: 'E', clef: 'bass', isLedger: true },
  { vexKey: 'f/2', octave: 2, letter: 'F', clef: 'bass', isLedger: true },
  // on staff
  { vexKey: 'g/2', octave: 2, letter: 'G', clef: 'bass', isLedger: false },
  { vexKey: 'a/2', octave: 2, letter: 'A', clef: 'bass', isLedger: false },
  { vexKey: 'b/2', octave: 2, letter: 'B', clef: 'bass', isLedger: false },
  { vexKey: 'c/3', octave: 3, letter: 'C', clef: 'bass', isLedger: false },
  { vexKey: 'd/3', octave: 3, letter: 'D', clef: 'bass', isLedger: false },
  { vexKey: 'e/3', octave: 3, letter: 'E', clef: 'bass', isLedger: false },
  { vexKey: 'f/3', octave: 3, letter: 'F', clef: 'bass', isLedger: false },
  { vexKey: 'g/3', octave: 3, letter: 'G', clef: 'bass', isLedger: false },
  { vexKey: 'a/3', octave: 3, letter: 'A', clef: 'bass', isLedger: false },
  // 1 ledger line above
  { vexKey: 'b/3', octave: 3, letter: 'B', clef: 'bass', isLedger: true },
  { vexKey: 'c/4', octave: 4, letter: 'C', clef: 'bass', isLedger: true },
];

export const ALL_NOTES: Note[] = [...TREBLE_NOTES, ...BASS_NOTES];

export function getNotesByClef(clef: Clef): Note[] {
  return ALL_NOTES.filter((n) => n.clef === clef);
}

export function getNoteByKey(vexKey: string, clef: Clef): Note | undefined {
  return ALL_NOTES.find((n) => n.vexKey === vexKey && n.clef === clef);
}

export function getDefaultEnabledNotes(clefs: Clef[]): string[] {
  return ALL_NOTES.filter((n) => clefs.includes(n.clef)).map((n) => n.vexKey + '|' + n.clef);
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

export function displayNoteName(letter: string, system: 'italian' | 'english'): string {
  return system === 'italian' ? ITALIAN[letter] : letter;
}

export const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
