import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getInstrument, heardMatches, soundingMidi, writtenPitch } from './instruments.ts';
import { ALL_NOTES } from './notes.ts';
import type { Note } from './types.ts';

function note(vexKey: string, clef: Note['clef']): Note {
  const found = ALL_NOTES.find((n) => n.vexKey === vexKey && n.clef === clef);
  assert.ok(found, `${vexKey} in ${clef} is not one of the written notes`);
  return found;
}

const MIDDLE_C = note('c/4', 'treble');

describe('soundingMidi', () => {
  it('sounds a clarinet in B♭ a major second below the staff', () => {
    // Written middle C (60) sounds B♭3 (58).
    assert.equal(soundingMidi(MIDDLE_C, 'clarinet-bb'), 58);
    assert.equal(soundingMidi(note('g/4', 'treble'), 'clarinet-bb'), 65);
  });

  it('transposes the clarinet in bass clef too', () => {
    assert.equal(soundingMidi(note('c/3', 'bass'), 'clarinet-bb'), 46);
  });

  it('keeps the guitar an octave below treble clef and at pitch in bass clef', () => {
    assert.equal(soundingMidi(MIDDLE_C, 'guitar'), 48);
    assert.equal(soundingMidi(note('c/4', 'bass'), 'guitar'), 60);
  });

  it('leaves concert-pitch instruments where they are written', () => {
    assert.equal(soundingMidi(MIDDLE_C, 'concert'), 60);
  });
});

describe('writtenPitch', () => {
  it('names a heard pitch the way the clarinettist reads it', () => {
    const written = writtenPitch(58, 'clarinet-bb', 'treble');
    assert.equal(written.letter, 'C');
    assert.equal(written.accidental, '');
    assert.equal(written.octave, 4);
  });

  it('round-trips every written note through its sounding pitch', () => {
    for (const id of ['guitar', 'clarinet-bb', 'concert'] as const) {
      for (const candidate of ALL_NOTES) {
        const back = writtenPitch(soundingMidi(candidate, id), id, candidate.clef);
        assert.equal(back.letter, candidate.letter, `${candidate.vexKey} on ${id}`);
        assert.equal(back.octave, candidate.octave, `${candidate.vexKey} on ${id}`);
      }
    }
  });
});

describe('heardMatches', () => {
  it('accepts the transposed pitch in any octave', () => {
    // B♭ in three octaves, all of them the right answer for a written C.
    for (const midi of [46, 58, 70]) {
      assert.equal(heardMatches(midi, MIDDLE_C, 'clarinet-bb', false), true);
    }
  });

  it('rejects the written pitch played at concert pitch', () => {
    assert.equal(heardMatches(60, MIDDLE_C, 'clarinet-bb', false), false);
  });

  it('holds the clarinet to the written octave when asked', () => {
    assert.equal(heardMatches(58, MIDDLE_C, 'clarinet-bb', true), true);
    assert.equal(heardMatches(46, MIDDLE_C, 'clarinet-bb', true), false);
  });

  it('still matches the guitar the way it did before', () => {
    assert.equal(heardMatches(48, MIDDLE_C, 'guitar', true), true);
    assert.equal(heardMatches(60, MIDDLE_C, 'guitar', false), true);
    assert.equal(heardMatches(61, MIDDLE_C, 'guitar', false), false);
  });
});

describe('getInstrument', () => {
  it('falls back rather than throwing on an id left over in storage', () => {
    assert.equal(getInstrument('trombone-in-f' as never).id, 'guitar');
  });

  it('gives sustaining instruments a pitch-change onset', () => {
    assert.equal(getInstrument('clarinet-bb').onset.rearmOnPitchChange, true);
    assert.equal(getInstrument('guitar').onset.rearmOnPitchChange, false);
  });
});
