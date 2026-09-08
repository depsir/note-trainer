import { MAJOR_KEYS } from './fifths';
import { displaySpelledNoteName, SpelledNote, spelledNoteId, spellFromTonic } from './scales';
import { NoteNameSystem, RelativeQuestionKind } from './types';

/** A relative minor is the 6th degree of its major: five letters and nine semitones up. */
const RELATIVE_MINOR_LETTER_STEPS = 5;
const RELATIVE_MINOR_SEMITONES = 9;

/** A major key and its relative minor — the two names that share one key signature. */
export interface RelativePair {
  /** Shares the major key's id, so the settings grid can stay the circle-of-fifths one */
  id: string;
  major: SpelledNote;
  minor: SpelledNote;
}

/**
 * The 15 relative pairs, in circle-of-fifths order. Every key of the circle has a relative
 * minor writable with a single accidental, so nothing actually drops out here.
 */
export const RELATIVE_PAIRS: RelativePair[] = MAJOR_KEYS.flatMap((key) => {
  const major: SpelledNote = { letter: key.letter, sign: key.accidental };
  const minor = spellFromTonic(major, RELATIVE_MINOR_LETTER_STEPS, RELATIVE_MINOR_SEMITONES);
  return minor ? [{ id: key.id, major, minor }] : [];
});

const PAIR_BY_ID = new Map(RELATIVE_PAIRS.map((pair) => [pair.id, pair]));

export function getRelativePair(id: string): RelativePair | undefined {
  return PAIR_BY_ID.get(id);
}

export const ALL_RELATIVE_QUESTION_KINDS: RelativeQuestionKind[] = ['major-to-minor', 'minor-to-major'];

/** The pairs in the configured pool, in circle-of-fifths order. */
export function relativeCandidates(enabledKeys: string[]): RelativePair[] {
  return RELATIVE_PAIRS.filter((pair) => enabledKeys.includes(pair.id));
}

export interface RelativeQuestion {
  kind: RelativeQuestionKind;
  pair: RelativePair;
}

export function relativeQuestionId(question: RelativeQuestion): string {
  return `${question.kind}|${question.pair.id}`;
}

/** The key the question shows. */
export function relativePrompt(question: RelativeQuestion): SpelledNote {
  return question.kind === 'major-to-minor' ? question.pair.major : question.pair.minor;
}

/** The keypad id the answer has to be. */
export function relativeAnswerId(question: RelativeQuestion): string {
  return spelledNoteId(question.kind === 'major-to-minor' ? question.pair.minor : question.pair.major);
}

/** Uniform draw over (pairs × directions), avoiding an immediate repeat. */
export function pickRelativeQuestion(
  pairs: RelativePair[],
  kinds: RelativeQuestionKind[],
  lastQuestionId?: string
): RelativeQuestion {
  if (pairs.length === 0) throw new Error('No candidate relative pairs');
  if (kinds.length === 0) throw new Error('No candidate question kinds');

  const pool: RelativeQuestion[] = [];
  for (const kind of kinds) {
    for (const pair of pairs) {
      pool.push({ kind, pair });
    }
  }

  const withoutRepeat = pool.length > 1 ? pool.filter((q) => relativeQuestionId(q) !== lastQuestionId) : pool;
  const candidates = withoutRepeat.length > 0 ? withoutRepeat : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Caption under the key name in the question card, and the mode of the answer asked for. */
export const RELATIVE_PROMPT_CAPTION: Record<RelativeQuestionKind, string> = {
  'major-to-minor': 'maggiore',
  'minor-to-major': 'minore',
};

export const RELATIVE_ANSWER_PROMPT: Record<RelativeQuestionKind, string> = {
  'major-to-minor': 'Qual è la relativa minore?',
  'minor-to-major': 'Qual è la relativa maggiore?',
};

export const RELATIVE_QUESTION_KIND_LABEL: Record<RelativeQuestionKind, string> = {
  'major-to-minor': 'Maggiore → minore',
  'minor-to-major': 'Minore → maggiore',
};

export const RELATIVE_QUESTION_KIND_HINT: Record<RelativeQuestionKind, string> = {
  'major-to-minor': 'Parti dalla maggiore e trova la relativa minore',
  'minor-to-major': 'Parti dalla minore e trova la relativa maggiore',
};

/** Pair label for the settings grid, e.g. "Do / La". */
export function displayRelativePair(pair: RelativePair, system: NoteNameSystem): string {
  return `${displaySpelledNoteName(pair.major, system)} / ${displaySpelledNoteName(pair.minor, system)}`;
}
