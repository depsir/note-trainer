import { intervalSemitones, qualitiesForDegree, qualityFilterForScope } from './intervals.ts';
import { ALL_TONIC_IDS, getTonic, spelledNoteId, spellFromTonic, type SpelledNote } from './scales.ts';
import type { IntervalQuality, IntervalQualityScope } from './types.ts';

/**
 * Degrees this mode asks. The octave is left out: its target is the root note itself,
 * so there is nothing to work out — the interval modes already drill recognising it.
 */
export const BUILD_DEGREES = [2, 3, 4, 5, 6, 7];

/**
 * Root spellings: the same 15 circle-of-fifths names the scale tonics come from, so the
 * pool never opens with something like Mi♯.
 */
export const ALL_BUILD_ROOT_IDS: string[] = ALL_TONIC_IDS;

export function getDefaultEnabledRoots(): string[] {
  return [...ALL_BUILD_ROOT_IDS];
}

export function getDefaultBuildDegrees(): number[] {
  return [...BUILD_DEGREES];
}

/** A root note plus an interval; the answer is the note that interval above it. */
export interface IntervalBuildQuestion {
  root: SpelledNote;
  degree: number;
  quality: IntervalQuality;
  /** The expected answer — always above the root */
  target: SpelledNote;
}

export function intervalBuildQuestionId(question: IntervalBuildQuestion): string {
  return `${spelledNoteId(question.root)}|${question.degree}|${question.quality}`;
}

/** The keypad id the answer has to be. */
export function intervalBuildAnswerId(question: IntervalBuildQuestion): string {
  return spelledNoteId(question.target);
}

/**
 * Every practisable (root × degree × quality) combo in the pool. Combos whose target
 * would need a double accidental (Do♯ + settima aumentata → Si♯♯) drop out silently,
 * the same way they do in the scale mode.
 */
export function intervalBuildCandidates(
  rootIds: string[],
  degrees: number[],
  scope: IntervalQualityScope
): IntervalBuildQuestion[] {
  const qualityFilter = qualityFilterForScope(scope);
  const candidates: IntervalBuildQuestion[] = [];

  for (const id of rootIds) {
    const root = getTonic(id);
    if (!root) continue;

    for (const degree of degrees) {
      for (const quality of qualitiesForDegree(degree)) {
        if (!qualityFilter(degree, quality)) continue;
        const semitones = intervalSemitones(degree, quality);
        if (semitones === null) continue;
        const target = spellFromTonic(root, degree - 1, semitones);
        if (!target) continue;
        candidates.push({ root, degree, quality, target });
      }
    }
  }

  return candidates;
}

/** Uniform draw over the candidate pool, avoiding an immediate repeat. */
export function pickIntervalBuildQuestion(
  candidates: IntervalBuildQuestion[],
  lastQuestionId?: string
): IntervalBuildQuestion {
  if (candidates.length === 0) throw new Error('No candidate interval builds');
  const withoutRepeat =
    candidates.length > 1
      ? candidates.filter((c) => intervalBuildQuestionId(c) !== lastQuestionId)
      : candidates;
  const pool = withoutRepeat.length > 0 ? withoutRepeat : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}
