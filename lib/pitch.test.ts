import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectPitch, frequencyToNote, levelToMeter, rms } from './pitch.ts';

const SAMPLE_RATE = 44100;
const WINDOW = 2048;

/** Deterministic noise, so a flaky run means a real regression. */
function makeNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 2147483648 - 1;
  };
}

/**
 * A plucked-string-ish tone: a fundamental plus harmonics whose amplitudes are
 * given as multiples of the fundamental's.
 */
function synthesize(
  frequency: number,
  harmonicAmplitudes: number[] = [1],
  { noiseLevel = 0, sampleRate = SAMPLE_RATE, length = WINDOW } = {}
): Float32Array {
  const noise = makeNoise(12345);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let value = 0;
    for (let h = 0; h < harmonicAmplitudes.length; h++) {
      const amplitude = harmonicAmplitudes[h];
      if (amplitude === 0) continue;
      value += amplitude * Math.sin((2 * Math.PI * frequency * (h + 1) * i) / sampleRate);
    }
    samples[i] = value * 0.3 + noise() * noiseLevel;
  }
  return samples;
}

function centsOff(detected: number, expected: number): number {
  return Math.abs(1200 * Math.log2(detected / expected));
}

/** Open strings in standard tuning, the pitches the exercises actually produce. */
const OPEN_STRINGS = [
  { name: 'E2', frequency: 82.41 },
  { name: 'A2', frequency: 110.0 },
  { name: 'D3', frequency: 146.83 },
  { name: 'G3', frequency: 196.0 },
  { name: 'B3', frequency: 246.94 },
  { name: 'E4', frequency: 329.63 },
];

describe('detectPitch', () => {
  for (const { name, frequency } of OPEN_STRINGS) {
    it(`tracks a pure tone at ${name}`, () => {
      const result = detectPitch(synthesize(frequency), SAMPLE_RATE);
      assert.ok(result, 'expected an estimate');
      assert.ok(centsOff(result.frequency, frequency) < 5, `${result.frequency} Hz is too far from ${frequency} Hz`);
      assert.ok(result.clarity > 0.9, `clarity ${result.clarity} too low for a pure tone`);
    });
  }

  for (const { name, frequency } of OPEN_STRINGS) {
    it(`tracks a harmonic-rich ${name} with noise`, () => {
      const guitar = [1, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08];
      const result = detectPitch(synthesize(frequency, guitar, { noiseLevel: 0.02 }), SAMPLE_RATE);
      assert.ok(result, 'expected an estimate');
      assert.ok(centsOff(result.frequency, frequency) < 10, `${result.frequency} Hz is too far from ${frequency} Hz`);
      assert.ok(result.clarity > 0.8, `clarity ${result.clarity} too low`);
    });
  }

  it('finds the fundamental even when it is missing from the signal', () => {
    // A lightly picked low string can have a second harmonic louder than the
    // fundamental; naive autocorrelation reads that an octave high.
    const result = detectPitch(synthesize(82.41, [0, 1, 0.7, 0.5, 0.3]), SAMPLE_RATE);
    assert.ok(result, 'expected an estimate');
    assert.ok(centsOff(result.frequency, 82.41) < 10, `${result.frequency} Hz should be E2, not an octave up`);
  });

  it('does not read a high pitch out of a low one', () => {
    const result = detectPitch(synthesize(110, [1, 0.8, 0.6, 0.4]), SAMPLE_RATE);
    assert.ok(result);
    assert.ok(result.frequency < 130, `${result.frequency} Hz looks like a harmonic, not the fundamental`);
  });

  it('reports near-zero clarity for noise', () => {
    const noise = makeNoise(7);
    const samples = new Float32Array(WINDOW);
    for (let i = 0; i < WINDOW; i++) samples[i] = noise() * 0.3;
    const result = detectPitch(samples, SAMPLE_RATE);
    assert.ok(!result || result.clarity < 0.5, `noise should not look periodic (clarity ${result?.clarity})`);
  });

  it('reports zero clarity for silence', () => {
    const result = detectPitch(new Float32Array(WINDOW), SAMPLE_RATE);
    assert.ok(!result || result.clarity === 0, 'silence should have no clarity');
  });

  it('returns null when the window is too short to hold a period', () => {
    assert.equal(detectPitch(new Float32Array(64), SAMPLE_RATE), null);
  });

  it('works at 48 kHz too', () => {
    const samples = synthesize(146.83, [1, 0.5, 0.3], { sampleRate: 48000 });
    const result = detectPitch(samples, 48000);
    assert.ok(result);
    assert.ok(centsOff(result.frequency, 146.83) < 10);
  });
});

describe('frequencyToNote', () => {
  it('names concert A', () => {
    const note = frequencyToNote(440);
    assert.deepEqual(
      { midi: note.midi, letter: note.letter, accidental: note.accidental, octave: note.octave, cents: note.cents },
      { midi: 69, letter: 'A', accidental: '', octave: 4, cents: 0 }
    );
  });

  it('names middle C', () => {
    const note = frequencyToNote(261.63);
    assert.equal(note.midi, 60);
    assert.equal(note.letter, 'C');
    assert.equal(note.octave, 4);
  });

  it('names the guitar low E', () => {
    const note = frequencyToNote(82.41);
    assert.equal(note.letter, 'E');
    assert.equal(note.octave, 2);
  });

  it('spells accidentals with sharps', () => {
    const note = frequencyToNote(369.99);
    assert.equal(note.letter, 'F');
    assert.equal(note.accidental, '#');
    assert.equal(note.octave, 4);
  });

  it('measures how far out of tune a pitch is', () => {
    const sharp = frequencyToNote(445);
    assert.equal(sharp.letter, 'A');
    assert.ok(sharp.cents > 15 && sharp.cents < 25, `expected ~+20 cents, got ${sharp.cents}`);

    const flat = frequencyToNote(435);
    assert.equal(flat.letter, 'A');
    assert.ok(flat.cents < -15 && flat.cents > -25, `expected ~-20 cents, got ${flat.cents}`);
  });

  it('follows a different concert pitch', () => {
    const note = frequencyToNote(432, 432);
    assert.equal(note.letter, 'A');
    assert.equal(note.cents, 0);
  });
});

describe('rms', () => {
  it('is zero for silence', () => {
    assert.equal(rms(new Float32Array(128)), 0);
  });

  it('is the amplitude over root two for a sine', () => {
    const samples = synthesize(440, [1], { length: 4410 });
    assert.ok(Math.abs(rms(samples) - 0.3 / Math.SQRT2) < 0.01);
  });
});

describe('levelToMeter', () => {
  it('is empty for silence and at the floor', () => {
    assert.equal(levelToMeter(0), 0);
    assert.equal(levelToMeter(0.001), 0);
    assert.equal(levelToMeter(0.0001), 0);
  });

  it('is full at full scale and above', () => {
    assert.equal(levelToMeter(1), 1);
    assert.equal(levelToMeter(2), 1);
  });

  it('is linear in decibels', () => {
    // −40 dBFS and −20 dBFS on a −60…0 scale
    assert.ok(Math.abs(levelToMeter(0.01) - 1 / 3) < 1e-9);
    assert.ok(Math.abs(levelToMeter(0.1) - 2 / 3) < 1e-9);
  });
});
