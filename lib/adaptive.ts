import { Note, AllNoteStats, NoteStats } from './types';
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

const DEFAULT_NOTE_STATS: NoteStats = {
  correct: 0,
  wrong: 0,
  weight: DEFAULT_WEIGHT,
  correctResponseTimeTotalMs: 0,
  timedCorrectResponses: 0,
};

export function normalizeNoteStats(noteStats?: Partial<NoteStats>): NoteStats {
  return {
    correct: noteStats?.correct ?? DEFAULT_NOTE_STATS.correct,
    wrong: noteStats?.wrong ?? DEFAULT_NOTE_STATS.wrong,
    weight: noteStats?.weight ?? DEFAULT_NOTE_STATS.weight,
    correctResponseTimeTotalMs:
      noteStats?.correctResponseTimeTotalMs ?? DEFAULT_NOTE_STATS.correctResponseTimeTotalMs,
    timedCorrectResponses: noteStats?.timedCorrectResponses ?? DEFAULT_NOTE_STATS.timedCorrectResponses,
  };
}

export function averageCorrectResponseTime(noteStats?: Partial<NoteStats>): number | null {
  const stats = normalizeNoteStats(noteStats);
  if (stats.timedCorrectResponses === 0) return null;
  return Math.round(stats.correctResponseTimeTotalMs / stats.timedCorrectResponses);
}

export interface NoteSelectionInsight {
  share: number;
  priorityLabel: string;
  reason: string;
  tone: 'zinc' | 'sky' | 'violet' | 'amber' | 'red' | 'emerald';
}

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

  const unseen = pool.filter((note) => {
    const noteStats = stats[noteId(note)];
    return !noteStats || noteStats.correct + noteStats.wrong === 0;
  });

  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  const weights = pool.map((n) => normalizeNoteStats(stats[noteId(n)]).weight);
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
  const current = normalizeNoteStats(stats[id]);

  let newWeight: number;
  const useTime = wasCorrect && responseTimeMs !== undefined && responseTimeMs <= MAX_RESPONSE_MS;
  if (wasCorrect) {
    // Interpolate: fast answer → strong reduction, slow answer → near-neutral or slight increase
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
      correctResponseTimeTotalMs: current.correctResponseTimeTotalMs + (useTime ? responseTimeMs! : 0),
      timedCorrectResponses: current.timedCorrectResponses + (useTime ? 1 : 0),
    },
  };
}

const LOG_MIN = Math.log(MIN_WEIGHT);
const LOG_MAX = Math.log(MAX_WEIGHT);

/**
 * Maps the adaptive weight to a 0–100 mastery score.
 * MIN_WEIGHT (0.2) → 100, DEFAULT (1.0) → 50, MAX_WEIGHT (5.0) → 0.
 */
export function masteryScore(weight: number): number {
  const t = (Math.log(weight) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return Math.round(Math.max(0, Math.min(100, (1 - t) * 100)));
}

export function initStats(ids: string[], existing: AllNoteStats): AllNoteStats {
  const result: AllNoteStats = { ...existing };
  for (const id of ids) {
    result[id] = normalizeNoteStats(result[id]);
  }
  return result;
}

export function getSelectionInsight(
  id: string,
  candidateIds: string[],
  stats: AllNoteStats,
  useAdaptive: boolean
): NoteSelectionInsight {
  if (!candidateIds.includes(id)) {
    return {
      share: 0,
      priorityLabel: 'Esclusa',
      reason: 'Nota esclusa dalla configurazione attuale.',
      tone: 'zinc',
    };
  }

  const uniformShare = candidateIds.length > 0 ? 1 / candidateIds.length : 0;

  if (!useAdaptive) {
    return {
      share: uniformShare,
      priorityLabel: 'Uniforme',
      reason: 'Modalita casuale attiva: tutte le note abilitate hanno la stessa probabilita.',
      tone: 'sky',
    };
  }

  const unseenIds = candidateIds.filter((candidateId) => {
    const noteStats = normalizeNoteStats(stats[candidateId]);
    return noteStats.correct + noteStats.wrong === 0;
  });

  if (unseenIds.length > 0) {
    if (unseenIds.includes(id)) {
      return {
        share: 1 / unseenIds.length,
        priorityLabel: 'Nuova',
        reason: "Non e ancora uscita: finche ci sono note nuove, l'algoritmo le distribuisce in modo uniforme.",
        tone: 'violet',
      };
    }

    return {
      share: 0,
      priorityLabel: 'In attesa',
      reason: 'Finche restano note mai viste, questa resta temporaneamente in secondo piano.',
      tone: 'zinc',
    };
  }

  const noteStats = normalizeNoteStats(stats[id]);
  const totalWeight = candidateIds.reduce((sum, candidateId) => {
    return sum + normalizeNoteStats(stats[candidateId]).weight;
  }, 0);
  const share = totalWeight > 0 ? noteStats.weight / totalWeight : uniformShare;
  const relativePriority = uniformShare > 0 ? share / uniformShare : 1;
  const avgCorrectResponseTime = averageCorrectResponseTime(noteStats);
  const errorLabel = noteStats.wrong === 1 ? 'errore' : 'errori';

  if (relativePriority >= 1.75) {
    return {
      share,
      priorityLabel: 'Molto alta',
      reason:
        noteStats.wrong > 0 && avgCorrectResponseTime !== null && avgCorrectResponseTime >= 3000
          ? `Ti viene riproposta spesso perche hai fatto ${noteStats.wrong} ${errorLabel} e le risposte corrette arrivano lentamente.`
          : noteStats.wrong > 0
            ? `Ti viene riproposta spesso perche hai fatto ${noteStats.wrong} ${errorLabel}.`
            : avgCorrectResponseTime !== null && avgCorrectResponseTime >= 3000
              ? 'Ti viene riproposta spesso perche la riconosci, ma ancora lentamente.'
              : 'Il suo peso e molto sopra la media del pool attivo.',
      tone: 'red',
    };
  }

  if (relativePriority >= 1.25) {
    return {
      share,
      priorityLabel: 'Alta',
      reason:
        noteStats.wrong > 0
          ? `Ha priorita alta: ${noteStats.wrong} ${errorLabel} recenti la tengono sopra la media del pool attivo.`
          : avgCorrectResponseTime !== null && avgCorrectResponseTime >= 2500
            ? 'Ha priorita alta perche le risposte corrette sono ancora lente.'
            : 'Il suo peso e sopra la media del pool attivo.',
      tone: 'amber',
    };
  }

  if (relativePriority <= 0.5) {
    return {
      share,
      priorityLabel: 'Molto bassa',
      reason:
        noteStats.wrong === 0 && noteStats.correct > 0 && avgCorrectResponseTime !== null && avgCorrectResponseTime <= 1800
          ? 'Ti viene proposta raramente perche la riconosci bene e in fretta.'
          : 'Ha meno priorita rispetto alle note che oggi ti mettono piu in difficolta.',
      tone: 'emerald',
    };
  }

  if (relativePriority <= 0.85) {
    return {
      share,
      priorityLabel: 'Bassa',
      reason:
        noteStats.correct > noteStats.wrong
          ? "La riconosci abbastanza bene, quindi l'algoritmo la abbassa sotto la media."
          : 'Al momento ha meno priorita del resto del pool attivo.',
      tone: 'emerald',
    };
  }

  return {
    share,
    priorityLabel: 'Media',
    reason: "Ha una priorita intermedia: l'algoritmo la sta tenendo in equilibrio con il resto del pool attivo.",
    tone: 'sky',
  };
}
