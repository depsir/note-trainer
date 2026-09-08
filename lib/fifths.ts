import { displaySpelledNote, FLAT, NOTE_LETTERS, SHARP } from './notes';
import { AccidentalSign, AccidentalType, Clef, FifthsQuestionKind, MajorKey, NoteNameSystem } from './types';

export const ACCIDENTAL_TYPE_SYMBOL: Record<Exclude<AccidentalType, 'none'>, string> = {
  sharp: SHARP,
  flat: FLAT,
};

function majorKey(id: string, letter: string, accidental: AccidentalSign, count: number, type: AccidentalType): MajorKey {
  return { id, letter, accidental, count, type };
}

/**
 * The 15 major keys, in circle-of-fifths order (7 flats → C → 7 sharps).
 * `id` doubles as the VexFlow key spec accepted by `Stave.addKeySignature`.
 */
export const MAJOR_KEYS: MajorKey[] = [
  majorKey('Cb', 'C', 'b', 7, 'flat'),
  majorKey('Gb', 'G', 'b', 6, 'flat'),
  majorKey('Db', 'D', 'b', 5, 'flat'),
  majorKey('Ab', 'A', 'b', 4, 'flat'),
  majorKey('Eb', 'E', 'b', 3, 'flat'),
  majorKey('Bb', 'B', 'b', 2, 'flat'),
  majorKey('F', 'F', '', 1, 'flat'),
  majorKey('C', 'C', '', 0, 'none'),
  majorKey('G', 'G', '', 1, 'sharp'),
  majorKey('D', 'D', '', 2, 'sharp'),
  majorKey('A', 'A', '', 3, 'sharp'),
  majorKey('E', 'E', '', 4, 'sharp'),
  majorKey('B', 'B', '', 5, 'sharp'),
  majorKey('F#', 'F', '#', 6, 'sharp'),
  majorKey('C#', 'C', '#', 7, 'sharp'),
];

export const MAX_ACCIDENTALS = 7;

export const ALL_QUESTION_KINDS: FifthsQuestionKind[] = ['signature-to-key', 'key-to-count'];

const KEYS_BY_ID = new Map(MAJOR_KEYS.map((key) => [key.id, key]));

export function getMajorKey(id: string): MajorKey | undefined {
  return KEYS_BY_ID.get(id);
}

export function getDefaultEnabledKeys(): string[] {
  return MAJOR_KEYS.map((key) => key.id);
}

/** Display label for a key, e.g. "Fa♯" (italian) or "F♯" (english). */
export function displayKeyName(key: MajorKey, system: NoteNameSystem): string {
  return displaySpelledNote(key.letter, key.accidental, system);
}

/** Stable id for an alteration-count answer: "0", "3#", "2b". */
export function countAnswerId(count: number, type: AccidentalType): string {
  if (count === 0 || type === 'none') return '0';
  return `${count}${type === 'sharp' ? '#' : 'b'}`;
}

export function keyCountAnswerId(key: MajorKey): string {
  return countAnswerId(key.count, key.type);
}

/** Display label for an alteration-count answer, e.g. "3♯" or "—" for none. */
export function displayCountAnswer(count: number, type: AccidentalType): string {
  if (count === 0 || type === 'none') return '0';
  return `${count}${ACCIDENTAL_TYPE_SYMBOL[type]}`;
}

export function displayKeyAccidentals(key: MajorKey, system: NoteNameSystem): string {
  const name = displayKeyName(key, system);
  if (key.count === 0) return `${name}: nessuna alterazione`;
  const kind = key.type === 'sharp' ? 'diesis' : 'bemolli';
  const singular = key.type === 'sharp' ? 'diesis' : 'bemolle';
  return `${name}: ${key.count} ${key.count === 1 ? singular : kind}`;
}

export interface FifthsQuestion {
  kind: FifthsQuestionKind;
  key: MajorKey;
  /** Clef the key signature is drawn in (only meaningful for 'signature-to-key') */
  clef: Clef;
}

export function questionAnswerId(question: FifthsQuestion): string {
  return question.kind === 'signature-to-key' ? question.key.id : keyCountAnswerId(question.key);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Uniform draw over (enabled keys × enabled question kinds), avoiding an immediate repeat. */
export function pickQuestion(
  keys: MajorKey[],
  kinds: FifthsQuestionKind[],
  clefs: Clef[],
  lastQuestionId?: string
): FifthsQuestion {
  if (keys.length === 0) throw new Error('No candidate keys');
  if (kinds.length === 0) throw new Error('No candidate question kinds');

  const pool: FifthsQuestion[] = [];
  for (const kind of kinds) {
    for (const key of keys) {
      pool.push({ kind, key, clef: 'treble' });
    }
  }

  const withoutRepeat = pool.length > 1 ? pool.filter((q) => questionId(q) !== lastQuestionId) : pool;
  const picked = pickRandom(withoutRepeat.length > 0 ? withoutRepeat : pool);
  return { ...picked, clef: clefs.length > 0 ? pickRandom(clefs) : 'treble' };
}

export function questionId(question: FifthsQuestion): string {
  return `${question.kind}|${question.key.id}`;
}

/**
 * Which accidental rows the answer keypads should offer.
 * Derived from the configured pool so a sharps-only setup never shows flat options,
 * while excluding single keys leaves the keypad untouched (it must not leak the answer).
 */
export function availableAccidentalTypes(keys: MajorKey[]): Exclude<AccidentalType, 'none'>[] {
  const types: Exclude<AccidentalType, 'none'>[] = [];
  if (keys.some((key) => key.type === 'flat')) types.push('flat');
  if (keys.some((key) => key.type === 'sharp')) types.push('sharp');
  return types;
}

/** Keypad rows wherever a note has to be spelled: sharps raise the pitch, so they sit on top. */
export const SPELLING_ROWS: AccidentalSign[] = ['#', '', 'b'];

/** Keys laid out as a letter-column grid: one row per accidental, C→B across. */
export interface KeyGridRow {
  accidental: AccidentalSign;
  cells: (MajorKey | null)[];
}

export function buildKeyGrid(accidentals: AccidentalSign[]): KeyGridRow[] {
  return accidentals.map((accidental) => ({
    accidental,
    cells: NOTE_LETTERS.map(
      (letter) => MAJOR_KEYS.find((key) => key.letter === letter && key.accidental === accidental) ?? null
    ),
  }));
}

/** Rows shown by the tonality keypad, driven by the accidental types in the pool. */
export function keyGridForPool(keys: MajorKey[]): KeyGridRow[] {
  const types = availableAccidentalTypes(keys);
  const accidentals: AccidentalSign[] = [];
  // '#'/'b' rows only appear when the pool actually contains sharp-side / flat-side keys.
  if (types.includes('sharp')) accidentals.push('#');
  accidentals.push('');
  if (types.includes('flat')) accidentals.push('b');
  return buildKeyGrid(accidentals);
}

export const QUESTION_KIND_LABEL: Record<FifthsQuestionKind, string> = {
  'signature-to-key': 'Armatura → tonalità',
  'key-to-count': 'Tonalità → alterazioni',
};

export const QUESTION_KIND_HINT: Record<FifthsQuestionKind, string> = {
  'signature-to-key': 'Vedi l’armatura e scegli la tonalità',
  'key-to-count': 'Leggi la tonalità e conta le alterazioni',
};

/** Key ids whose signature uses one of `types` (C major always joins, it has none). */
export function keyIdsForTypes(types: Exclude<AccidentalType, 'none'>[]): string[] {
  return MAJOR_KEYS.filter((key) => key.type === 'none' || types.includes(key.type)).map((key) => key.id);
}

/** All three accidental rows, wherever every key must stay reachable: the settings grid, the relative keypad. */
export const FULL_KEY_GRID: KeyGridRow[] = buildKeyGrid(SPELLING_ROWS);
