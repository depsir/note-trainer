import { ACCIDENTAL_TYPE_SYMBOL } from './fifths';
import { getNotesByClef, NOTE_LETTERS, displayNoteName } from './notes';
import { AccidentalType, Clef, IntervalQuality, NoteNameSystem, TrainingMode } from './types';

/** Interval numbers this app quizzes: 2nd through 8th (unison is skipped — degenerate/rarely drilled). */
export const ALL_DEGREES = [2, 3, 4, 5, 6, 7, 8];

const PERFECT_DEGREES = new Set([4, 5, 8]);

export function isPerfectDegree(degree: number): boolean {
  return PERFECT_DEGREES.has(degree);
}

/** Semitones between the root and a diatonic degree when the interval is major/perfect. */
const DEGREE_REF_SEMITONES: Record<number, number> = { 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12 };

const LETTER_BASE_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTER_ORDER: readonly string[] = NOTE_LETTERS;

const ACCIDENTAL_VALUE: Record<AccidentalType, number> = { none: 0, sharp: 1, flat: -1 };

/** Semitone offset from the major/perfect reference for a given quality; null if that quality doesn't exist for the degree's type. */
function qualityDiff(degree: number, quality: IntervalQuality): number | null {
  if (isPerfectDegree(degree)) {
    if (quality === 'diminished') return -1;
    if (quality === 'perfect') return 0;
    if (quality === 'augmented') return 1;
    return null;
  }
  if (quality === 'diminished') return -2;
  if (quality === 'minor') return -1;
  if (quality === 'major') return 0;
  if (quality === 'augmented') return 1;
  return null;
}

export function qualitiesForDegree(degree: number): IntervalQuality[] {
  return isPerfectDegree(degree) ? ['diminished', 'perfect', 'augmented'] : ['diminished', 'minor', 'major', 'augmented'];
}

/** The quality asked in "intervals-major" mode: only perfect / major, never minor/diminished/augmented. */
export function defaultQuality(degree: number): IntervalQuality {
  return isPerfectDegree(degree) ? 'perfect' : 'major';
}

export interface IntervalEndpoint {
  letter: string;
  accidental: AccidentalType;
  octave: number;
}

export interface IntervalQuestion {
  degree: number;
  quality: IntervalQuality;
  clef: Clef;
  root: IntervalEndpoint;
  target: IntervalEndpoint;
}

function endpointVexKey(endpoint: IntervalEndpoint): string {
  const suffix = endpoint.accidental === 'sharp' ? '#' : endpoint.accidental === 'flat' ? 'b' : '';
  return `${endpoint.letter.toLowerCase()}${suffix}/${endpoint.octave}`;
}

export function rootVexKey(question: IntervalQuestion): string {
  return endpointVexKey(question.root);
}

export function targetVexKey(question: IntervalQuestion): string {
  return endpointVexKey(question.target);
}

/**
 * Every (root note, degree, quality) combo whose target note fits within the clef's
 * practised staff range and is spellable with a single sharp/flat (no double accidentals).
 * Precomputed once — the search space is tiny and never changes at runtime.
 */
function buildCandidates(clef: Clef): IntervalQuestion[] {
  const clefNotes = getNotesByClef(clef);
  const positions = new Set(clefNotes.map((n) => `${n.letter}${n.octave}`));
  const accidentals: AccidentalType[] = ['none', 'sharp', 'flat'];
  const results: IntervalQuestion[] = [];

  for (const rootNote of clefNotes) {
    const rootLetterIdx = LETTER_ORDER.indexOf(rootNote.letter);

    for (const rootAccidental of accidentals) {
      const rootSemitone =
        LETTER_BASE_SEMITONE[rootNote.letter] + ACCIDENTAL_VALUE[rootAccidental] + 12 * rootNote.octave;

      for (const degree of ALL_DEGREES) {
        const steps = degree - 1;
        const targetLetterIdx = (rootLetterIdx + steps) % 7;
        const octaveSteps = Math.floor((rootLetterIdx + steps) / 7);
        const targetLetter = NOTE_LETTERS[targetLetterIdx];
        const targetOctave = rootNote.octave + octaveSteps;
        if (!positions.has(`${targetLetter}${targetOctave}`)) continue;

        const targetNaturalSemitone = LETTER_BASE_SEMITONE[targetLetter] + 12 * targetOctave;

        for (const quality of qualitiesForDegree(degree)) {
          const diff = qualityDiff(degree, quality);
          if (diff === null) continue;

          const requiredTargetSemitone = rootSemitone + DEGREE_REF_SEMITONES[degree] + diff;
          const targetAccidentalValue = requiredTargetSemitone - targetNaturalSemitone;
          if (targetAccidentalValue < -1 || targetAccidentalValue > 1) continue;
          const targetAccidental: AccidentalType =
            targetAccidentalValue === 1 ? 'sharp' : targetAccidentalValue === -1 ? 'flat' : 'none';

          results.push({
            degree,
            quality,
            clef,
            root: { letter: rootNote.letter, accidental: rootAccidental, octave: rootNote.octave },
            target: { letter: targetLetter, accidental: targetAccidental, octave: targetOctave },
          });
        }
      }
    }
  }

  return results;
}

const CANDIDATES_BY_CLEF: Record<Clef, IntervalQuestion[]> = {
  treble: buildCandidates('treble'),
  bass: buildCandidates('bass'),
};

export function qualityFilterForMode(mode: TrainingMode): (degree: number, quality: IntervalQuality) => boolean {
  return mode === 'intervals-major'
    ? (degree, quality) => quality === defaultQuality(degree)
    : () => true;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function intervalQuestionId(question: IntervalQuestion): string {
  return `${question.clef}|${question.root.letter}${question.root.accidental}${question.root.octave}|${question.degree}|${question.quality}`;
}

/** Uniform draw over the candidate pool matching the enabled degrees and mode, avoiding an immediate repeat. */
export function pickIntervalQuestion(
  clefs: Clef[],
  enabledDegrees: number[],
  mode: TrainingMode,
  lastQuestionId?: string
): IntervalQuestion {
  const qualityFilter = qualityFilterForMode(mode);
  const candidateClefs = clefs.length > 0 ? clefs : (['treble'] as Clef[]);

  const pool: IntervalQuestion[] = [];
  for (const clef of candidateClefs) {
    for (const question of CANDIDATES_BY_CLEF[clef]) {
      if (!enabledDegrees.includes(question.degree)) continue;
      if (!qualityFilter(question.degree, question.quality)) continue;
      pool.push(question);
    }
  }
  if (pool.length === 0) throw new Error('No candidate intervals');

  const withoutRepeat = pool.length > 1 ? pool.filter((q) => intervalQuestionId(q) !== lastQuestionId) : pool;
  return pickRandom(withoutRepeat.length > 0 ? withoutRepeat : pool);
}

/** Synthetic answer id, e.g. "3" (major/perfect), "3b" (minor), "3bb" (diminished 3rd), "4#" (augmented 4th). */
export function intervalAnswerId(degree: number, quality: IntervalQuality): string {
  if (isPerfectDegree(degree)) {
    if (quality === 'diminished') return `${degree}b`;
    if (quality === 'augmented') return `${degree}#`;
    return `${degree}`;
  }
  if (quality === 'diminished') return `${degree}bb`;
  if (quality === 'minor') return `${degree}b`;
  if (quality === 'augmented') return `${degree}#`;
  return `${degree}`;
}

export function questionAnswerId(question: IntervalQuestion): string {
  return intervalAnswerId(question.degree, question.quality);
}

/** Compact button label, e.g. "3", "3♭", "3♭♭", "4♯". */
export function displayIntervalAnswer(degree: number, quality: IntervalQuality): string {
  const flat = ACCIDENTAL_TYPE_SYMBOL.flat;
  const sharp = ACCIDENTAL_TYPE_SYMBOL.sharp;
  if (isPerfectDegree(degree)) {
    if (quality === 'diminished') return `${degree}${flat}`;
    if (quality === 'augmented') return `${degree}${sharp}`;
    return `${degree}`;
  }
  if (quality === 'diminished') return `${degree}${flat}${flat}`;
  if (quality === 'minor') return `${degree}${flat}`;
  if (quality === 'augmented') return `${degree}${sharp}`;
  return `${degree}`;
}

const DEGREE_NAME_IT: Record<number, string> = {
  2: 'seconda', 3: 'terza', 4: 'quarta', 5: 'quinta', 6: 'sesta', 7: 'settima', 8: 'ottava',
};

const QUALITY_NAME_IT: Record<IntervalQuality, string> = {
  diminished: 'diminuita',
  minor: 'minore',
  perfect: 'giusta',
  major: 'maggiore',
  augmented: 'aumentata',
};

/** Full Italian name, e.g. "terza maggiore", "quinta diminuita". */
export function displayIntervalName(degree: number, quality: IntervalQuality): string {
  return `${DEGREE_NAME_IT[degree]} ${QUALITY_NAME_IT[quality]}`;
}

/** Short label for the degree-toggle buttons in settings, e.g. "3ª". */
export function displayDegreeOrdinal(degree: number): string {
  return `${degree}ª`;
}

/** Note name + accidental glyph, e.g. "Sol♯" — used by the "letters" presentation. */
export function displayEndpointName(endpoint: IntervalEndpoint, nameSystem: NoteNameSystem): string {
  const symbol = endpoint.accidental === 'none' ? '' : ACCIDENTAL_TYPE_SYMBOL[endpoint.accidental];
  return `${displayNoteName(endpoint.letter, nameSystem)}${symbol}`;
}

export function getDefaultEnabledDegrees(): number[] {
  return [...ALL_DEGREES];
}

/** Which quality "rows" a mode's answer keypad shows — mode1 asks only the default quality. */
export type IntervalGridRowKind = 'diminished' | 'minor' | 'default' | 'augmented';

export const INTERVAL_GRID_ROWS_MAJOR: IntervalGridRowKind[] = ['default'];
export const INTERVAL_GRID_ROWS_ANY: IntervalGridRowKind[] = ['diminished', 'minor', 'default', 'augmented'];

function qualityForCell(degree: number, rowKind: IntervalGridRowKind): IntervalQuality | null {
  if (rowKind === 'diminished') return 'diminished';
  if (rowKind === 'augmented') return 'augmented';
  if (rowKind === 'default') return defaultQuality(degree);
  return isPerfectDegree(degree) ? null : 'minor';
}

export interface IntervalGridCell {
  degree: number;
  quality: IntervalQuality;
}

export interface IntervalGridRow {
  rowKind: IntervalGridRowKind;
  cells: (IntervalGridCell | null)[];
}

/** Row-per-quality, column-per-degree grid for the answer keypad — always the full ALL_DEGREES set. */
export function buildIntervalGrid(rowKinds: IntervalGridRowKind[]): IntervalGridRow[] {
  return rowKinds.map((rowKind) => ({
    rowKind,
    cells: ALL_DEGREES.map((degree) => {
      const quality = qualityForCell(degree, rowKind);
      return quality ? { degree, quality } : null;
    }),
  }));
}

export function gridRowsForMode(mode: TrainingMode): IntervalGridRowKind[] {
  return mode === 'intervals-major' ? INTERVAL_GRID_ROWS_MAJOR : INTERVAL_GRID_ROWS_ANY;
}
