import type { AccidentalSign } from './types';

/**
 * Monophonic pitch detection (YIN) plus the frequency → note-name conversion.
 *
 * Pure functions on purpose: no Web Audio, no DOM. The audio graph feeds raw
 * samples in, which keeps the whole detector testable against synthetic tones.
 */

/** Lowest pitch we look for: a little under E2 (82.4 Hz), the guitar's bottom string. */
const DEFAULT_MIN_FREQUENCY = 70;
/** Highest pitch we look for; well above anything the exercises ask for. */
const DEFAULT_MAX_FREQUENCY = 1400;
/** YIN's absolute threshold — below this a dip counts as the period. */
const DEFAULT_THRESHOLD = 0.12;

/** Concert pitch the note names are derived from. */
export const DEFAULT_A4 = 440;

export interface DetectPitchOptions {
  minFrequency?: number;
  maxFrequency?: number;
  /** YIN threshold; lower = stricter about what counts as periodic */
  threshold?: number;
}

export interface PitchEstimate {
  frequency: number;
  /** 0–1 periodicity measure; noise and silence land near 0 */
  clarity: number;
}

/**
 * Estimate the fundamental frequency of `samples`.
 *
 * Always returns its best guess when the window is long enough to hold one —
 * callers gate on `clarity` rather than getting a second opinion here.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: DetectPitchOptions = {}
): PitchEstimate | null {
  const minFrequency = options.minFrequency ?? DEFAULT_MIN_FREQUENCY;
  const maxFrequency = options.maxFrequency ?? DEFAULT_MAX_FREQUENCY;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  // The difference function compares the window against itself shifted by tau,
  // so only half the buffer can be used as the comparison window.
  const halfWindow = samples.length >> 1;
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxTau = Math.min(halfWindow - 1, Math.ceil(sampleRate / minFrequency));
  if (maxTau <= minTau) return null;

  // Squared difference for every lag. Lags below minTau are computed too: the
  // cumulative mean below needs them even though we never search there.
  const diff = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < halfWindow; i++) {
      const delta = samples[i] - samples[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Cumulative mean normalized difference — this is what makes YIN resistant to
  // the octave-down error plain autocorrelation suffers from.
  const normalized = new Float32Array(maxTau + 1);
  normalized[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    normalized[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  // Take the *first* dip under the threshold, not the deepest one: the deepest
  // is often a multiple of the true period, which would read an octave low.
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (normalized[tau] >= threshold) continue;
    let best = tau;
    while (best + 1 <= maxTau && normalized[best + 1] < normalized[best]) best++;
    tauEstimate = best;
    break;
  }

  if (tauEstimate === -1) {
    // Nothing periodic enough; report the shallowest dip and let its low
    // clarity speak for itself.
    tauEstimate = minTau;
    for (let tau = minTau + 1; tau <= maxTau; tau++) {
      if (normalized[tau] < normalized[tauEstimate]) tauEstimate = tau;
    }
  }

  const refinedTau = refineTau(normalized, tauEstimate, minTau, maxTau);
  const frequency = sampleRate / refinedTau;
  if (frequency < minFrequency || frequency > maxFrequency) return null;

  return { frequency, clarity: clamp01(1 - normalized[tauEstimate]) };
}

/** Sub-sample the dip with a parabola through its two neighbours. */
function refineTau(normalized: Float32Array, tau: number, minTau: number, maxTau: number): number {
  if (tau <= minTau || tau >= maxTau) return tau;
  const before = normalized[tau - 1];
  const at = normalized[tau];
  const after = normalized[tau + 1];
  const denominator = 2 * (2 * at - after - before);
  if (denominator === 0) return tau;
  return tau + (after - before) / denominator;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Root mean square of a block — the envelope the noise gate and onset watch. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function frequencyToMidi(frequency: number, a4 = DEFAULT_A4): number {
  return 69 + 12 * Math.log2(frequency / a4);
}

export function midiToFrequency(midi: number, a4 = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Sharp spelling of each semitone in an octave, C = 0. */
const SEMITONE_SPELLING: { letter: string; accidental: AccidentalSign }[] = [
  { letter: 'C', accidental: '' },
  { letter: 'C', accidental: '#' },
  { letter: 'D', accidental: '' },
  { letter: 'D', accidental: '#' },
  { letter: 'E', accidental: '' },
  { letter: 'F', accidental: '' },
  { letter: 'F', accidental: '#' },
  { letter: 'G', accidental: '' },
  { letter: 'G', accidental: '#' },
  { letter: 'A', accidental: '' },
  { letter: 'A', accidental: '#' },
  { letter: 'B', accidental: '' },
];

export interface DetectedNote {
  /** Nearest tempered pitch, as a MIDI number (60 = middle C) */
  midi: number;
  /** Letter name A–G of that pitch */
  letter: string;
  /** Its accidental, always spelled with sharps */
  accidental: AccidentalSign;
  /** Scientific octave: middle C is C4 */
  octave: number;
  /** How far the heard pitch sits from the tempered one, −50…+50 */
  cents: number;
}

/** Snap a frequency to the nearest tempered pitch and name it. */
export function frequencyToNote(frequency: number, a4 = DEFAULT_A4): DetectedNote {
  const exactMidi = frequencyToMidi(frequency, a4);
  const midi = Math.round(exactMidi);
  const semitone = ((midi % 12) + 12) % 12;
  return {
    midi,
    letter: SEMITONE_SPELLING[semitone].letter,
    accidental: SEMITONE_SPELLING[semitone].accidental,
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exactMidi - midi) * 100),
  };
}
