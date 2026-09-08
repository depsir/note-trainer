import { MAJOR_KEYS } from './fifths';
import { displaySpelledNote, LETTER_BASE_SEMITONE, NOTE_LETTERS, SIGN_SEMITONE } from './notes';
import { AccidentalSign, NoteNameSystem, ScaleType } from './types';

/** Notes in a scale, tonic included; the octave repeat adds nothing to memorise. */
export const SCALE_DEGREES = 7;

export const ALL_SCALE_TYPES: ScaleType[] = ['major', 'minor-natural', 'minor-harmonic', 'minor-melodic'];

/**
 * Semitones above the tonic for each degree, ascending.
 * The melodic minor is asked ascending only — its descending form is the natural minor,
 * which is already a scale type of its own here.
 */
const SCALE_PATTERN: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'minor-natural': [0, 2, 3, 5, 7, 8, 10],
  'minor-harmonic': [0, 2, 3, 5, 7, 8, 11],
  'minor-melodic': [0, 2, 3, 5, 7, 9, 11],
};

const LETTER_ORDER: readonly string[] = NOTE_LETTERS;

const SIGN_BY_SEMITONE: Record<number, AccidentalSign> = { 0: '', 1: '#', [-1]: 'b' };

/** A note as it is written: a letter plus at most one accidental. */
export interface SpelledNote {
  letter: string;
  sign: AccidentalSign;
}

/** Stable id, also the answer id of a keypad cell: "G", "F#", "Eb". */
export function spelledNoteId(note: SpelledNote): string {
  return note.letter + note.sign;
}

export function displaySpelledNoteName(note: SpelledNote, system: NoteNameSystem): string {
  return displaySpelledNote(note.letter, note.sign, system);
}

/**
 * The scale's seven notes, or null when the spelling would need a double accidental
 * (G♯/D♯/A♯ harmonic and melodic minor, D♭/G♭/C♭ minor). Those are left out of the pool
 * rather than pushing the keypad to five rows for three tonalities.
 */
function buildScale(tonic: SpelledNote, type: ScaleType): SpelledNote[] | null {
  const tonicLetterIndex = LETTER_ORDER.indexOf(tonic.letter);
  const tonicSemitone = LETTER_BASE_SEMITONE[tonic.letter] + SIGN_SEMITONE[tonic.sign];
  const notes: SpelledNote[] = [];

  for (let degree = 0; degree < SCALE_DEGREES; degree++) {
    // One letter per degree, in order: a diatonic scale never reuses or skips a letter.
    const letterIndex = tonicLetterIndex + degree;
    const letter = LETTER_ORDER[letterIndex % 7];
    const naturalSemitone = LETTER_BASE_SEMITONE[letter] + 12 * Math.floor(letterIndex / 7);
    const sign = SIGN_BY_SEMITONE[tonicSemitone + SCALE_PATTERN[type][degree] - naturalSemitone];
    if (sign === undefined) return null;
    notes.push({ letter, sign });
  }

  return notes;
}

/** Tonic spellings, sharing their ids with the circle-of-fifths key list. */
const TONICS: SpelledNote[] = MAJOR_KEYS.map((key) => ({ letter: key.letter, sign: key.accidental }));

export const ALL_TONIC_IDS: string[] = TONICS.map(spelledNoteId);

const TONIC_BY_ID = new Map(TONICS.map((tonic) => [spelledNoteId(tonic), tonic]));

export function getTonic(id: string): SpelledNote | undefined {
  return TONIC_BY_ID.get(id);
}

export function getDefaultEnabledTonics(): string[] {
  return [...ALL_TONIC_IDS];
}

export interface ScaleQuestion {
  tonic: SpelledNote;
  type: ScaleType;
  /** The expected answer, degree by degree */
  notes: SpelledNote[];
}

export function scaleQuestionId(question: ScaleQuestion): string {
  return `${question.type}|${spelledNoteId(question.tonic)}`;
}

/** Every practisable (tonic × type) pair in the pool; unspellable ones drop out silently. */
export function scaleCandidates(tonicIds: string[], types: ScaleType[]): ScaleQuestion[] {
  const candidates: ScaleQuestion[] = [];
  for (const type of types) {
    for (const id of tonicIds) {
      const tonic = getTonic(id);
      if (!tonic) continue;
      const notes = buildScale(tonic, type);
      if (notes) candidates.push({ tonic, type, notes });
    }
  }
  return candidates;
}

/** Uniform draw over the candidate pool, avoiding an immediate repeat. */
export function pickScaleQuestion(candidates: ScaleQuestion[], lastQuestionId?: string): ScaleQuestion {
  if (candidates.length === 0) throw new Error('No candidate scales');
  const withoutRepeat =
    candidates.length > 1 ? candidates.filter((c) => scaleQuestionId(c) !== lastQuestionId) : candidates;
  const pool = withoutRepeat.length > 0 ? withoutRepeat : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface ScaleKeypadColumn {
  /** 1-based scale degree */
  degree: number;
  letter: string;
}

/**
 * Keypad columns rotated onto the tonic, so column N is always the Nth degree.
 * The letters follow automatically from the tonic — what has to be recalled is the
 * accidental of each degree, and this layout is what puts that front and centre.
 */
export function scaleKeypadColumns(tonic: SpelledNote): ScaleKeypadColumn[] {
  const tonicLetterIndex = LETTER_ORDER.indexOf(tonic.letter);
  return Array.from({ length: SCALE_DEGREES }, (_, i) => ({
    degree: i + 1,
    letter: LETTER_ORDER[(tonicLetterIndex + i) % 7],
  }));
}

export const SCALE_TYPE_LABEL: Record<ScaleType, string> = {
  major: 'Maggiore',
  'minor-natural': 'Minore naturale',
  'minor-harmonic': 'Minore armonica',
  'minor-melodic': 'Minore melodica',
};

export const SCALE_TYPE_HINT: Record<ScaleType, string> = {
  major: 'Tutti i gradi naturali rispetto alla tonica',
  'minor-natural': '3ª, 6ª e 7ª abbassate',
  'minor-harmonic': 'Come la naturale, ma 7ª alzata',
  'minor-melodic': 'Ascendente: 6ª e 7ª alzate',
};

/** Caption under the tonic in the question card, e.g. "minore armonica". */
export const SCALE_TYPE_CAPTION: Record<ScaleType, string> = {
  major: 'maggiore',
  'minor-natural': 'minore naturale',
  'minor-harmonic': 'minore armonica',
  'minor-melodic': 'minore melodica',
};

/** Full name, e.g. "Sol maggiore". */
export function displayScaleName(question: ScaleQuestion, system: NoteNameSystem): string {
  return `${displaySpelledNoteName(question.tonic, system)} ${SCALE_TYPE_CAPTION[question.type]}`;
}
