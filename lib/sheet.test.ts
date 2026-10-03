import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_NOTES, noteId } from './notes.ts';
import { BEATS_PER_MEASURE, buildSheet, measureOf, normalizeMeasures, sheetNoteCount } from './sheet.ts';
import type { AllNoteStats, Note } from './types.ts';

const NO_STATS: AllNoteStats = {};

function trebleNotes(): Note[] {
  return ALL_NOTES.filter((note) => note.clef === 'treble');
}

describe('normalizeMeasures', () => {
  it('keeps the offered bar counts', () => {
    assert.equal(normalizeMeasures(2), 2);
    assert.equal(normalizeMeasures(16), 16);
  });

  it('clamps anything outside them', () => {
    assert.equal(normalizeMeasures(0), 2);
    assert.equal(normalizeMeasures(-5), 2);
    assert.equal(normalizeMeasures(100), 16);
  });

  it('falls back to the default for a value that is not a number', () => {
    assert.equal(normalizeMeasures(Number.NaN), 4);
  });
});

describe('sheetNoteCount', () => {
  it('counts one note per beat', () => {
    assert.equal(sheetNoteCount(4), 4 * BEATS_PER_MEASURE);
  });
});

describe('measureOf', () => {
  it('numbers bars from one', () => {
    assert.equal(measureOf(0), 1);
    assert.equal(measureOf(BEATS_PER_MEASURE - 1), 1);
    assert.equal(measureOf(BEATS_PER_MEASURE), 2);
  });
});

describe('buildSheet', () => {
  it('writes a full bar for every measure asked', () => {
    const sheet = buildSheet(trebleNotes(), NO_STATS, false, 4);
    assert.equal(sheet.measures, 4);
    assert.equal(sheet.notes.length, 4 * BEATS_PER_MEASURE);
  });

  it('writes the whole piece in a single clef', () => {
    for (let run = 0; run < 20; run++) {
      const sheet = buildSheet(ALL_NOTES, NO_STATS, false, 8);
      assert.ok(sheet.notes.every((note) => note.clef === sheet.clef));
    }
  });

  it('only uses notes that were enabled', () => {
    const enabled = trebleNotes().slice(0, 5);
    const allowed = new Set(enabled.map(noteId));
    const sheet = buildSheet(enabled, NO_STATS, true, 16);
    assert.ok(sheet.notes.every((note) => allowed.has(noteId(note))));
  });

  it('never repeats a note back to back', () => {
    const sheet = buildSheet(trebleNotes(), NO_STATS, false, 16);
    for (let i = 1; i < sheet.notes.length; i++) {
      assert.notEqual(noteId(sheet.notes[i]), noteId(sheet.notes[i - 1]));
    }
  });

  it('repeats the only enabled note rather than giving up', () => {
    const single = trebleNotes().slice(0, 1);
    const sheet = buildSheet(single, NO_STATS, false, 2);
    assert.equal(sheet.notes.length, 2 * BEATS_PER_MEASURE);
    assert.ok(sheet.notes.every((note) => noteId(note) === noteId(single[0])));
  });

  it('clamps a bar count it was handed out of range', () => {
    assert.equal(buildSheet(trebleNotes(), NO_STATS, false, 999).measures, 16);
  });

  it('refuses to write a piece with nothing to write it from', () => {
    assert.throws(() => buildSheet([], NO_STATS, false, 4));
  });
});
