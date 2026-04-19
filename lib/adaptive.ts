import { Note, AllNoteStats } from './types';
import { noteId } from './notes';

const DEFAULT_WEIGHT = 1.0;
const WEIGHT_ON_CORRECT = 0.85;
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

export function updateWeight(
  stats: AllNoteStats,
  id: string,
  wasCorrect: boolean
): AllNoteStats {
  const current = stats[id] ?? { correct: 0, wrong: 0, weight: DEFAULT_WEIGHT };
  const newWeight = wasCorrect
    ? Math.max(MIN_WEIGHT, current.weight * WEIGHT_ON_CORRECT)
    : Math.min(MAX_WEIGHT, current.weight * WEIGHT_ON_WRONG);

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
