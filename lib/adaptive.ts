import { Note, AllNoteStats } from './types';
import { noteId } from './notes';

const DEFAULT_WEIGHT = 1.0;
/** Weight multiplier for a fast correct answer (≤ 0 ms) */
const WEIGHT_ON_CORRECT_FAST = 0.85;
/** Weight multiplier for a slow correct answer (at MAX_RESPONSE_MS) */
const WEIGHT_ON_CORRECT_SLOW = 1.1;
/** Response times above this are ignored (user was distracted) */
const MAX_RESPONSE_MS = 8000;
const WEIGHT_ON_WRONG = 1.5;
const MIN_WEIGHT = 0.2;
const MAX_WEIGHT = 5.0;

/** Pick a note using weighted random selection */
export function pickNote(
  candidates: Note[],
  stats: AllNoteStats,
  useAdaptive: boolean,
  lastNoteId?: string
): Note {
  if (candidates.length === 0) throw new Error('No candidate notes');

  // Avoid repeating the same note if possible
  const pool = candidates.length > 1 ? candidates.filter((n) => noteId(n) !== lastNoteId) : candidates;

  if (!useAdaptive) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const weights = pool.map((n) => stats[noteId(n)]?.weight ?? DEFAULT_WEIGHT);
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * @param responseTimeMs - ms from note display to answer press.
 *   If undefined or > MAX_RESPONSE_MS, time is ignored (distracted).
 */
export function updateWeight(
  stats: AllNoteStats,
  id: string,
  wasCorrect: boolean,
  responseTimeMs?: number
): AllNoteStats {
  const current = stats[id] ?? { correct: 0, wrong: 0, weight: DEFAULT_WEIGHT };

  let newWeight: number;
  if (wasCorrect) {
    // Interpolate: fast answer → strong reduction, slow answer → near-neutral or slight increase
    const useTime = responseTimeMs !== undefined && responseTimeMs <= MAX_RESPONSE_MS;
    const t = useTime ? responseTimeMs! / MAX_RESPONSE_MS : 0;
    const factor = WEIGHT_ON_CORRECT_FAST + (WEIGHT_ON_CORRECT_SLOW - WEIGHT_ON_CORRECT_FAST) * t;
    newWeight = Math.max(MIN_WEIGHT, current.weight * factor);
  } else {
    newWeight = Math.min(MAX_WEIGHT, current.weight * WEIGHT_ON_WRONG);
  }

  return {
    ...stats,
    [id]: {
      correct: current.correct + (wasCorrect ? 1 : 0),
      wrong: current.wrong + (wasCorrect ? 0 : 1),
      weight: newWeight,
    },
  };
}

export function initStats(ids: string[], existing: AllNoteStats): AllNoteStats {
  const result: AllNoteStats = { ...existing };
  for (const id of ids) {
    if (!result[id]) {
      result[id] = { correct: 0, wrong: 0, weight: DEFAULT_WEIGHT };
    }
  }
  return result;
}
