import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDefaultEnabledNotes, getNotesByClef, ledgerLinesAt } from './notes.ts';

describe('getNotesByClef', () => {
  it('reaches three ledger lines past either clef', () => {
    const treble = getNotesByClef('treble').map((n) => n.vexKey);
    const bass = getNotesByClef('bass').map((n) => n.vexKey);
    assert.deepEqual([treble[0], treble.at(-1)], ['f/3', 'e/6']);
    assert.deepEqual([bass[0], bass.at(-1)], ['a/1', 'g/4']);
  });

  it('narrows to the ledger lines asked for', () => {
    const treble = getNotesByClef('treble', 2).map((n) => n.vexKey);
    assert.deepEqual([treble[0], treble.at(-1)], ['a/3', 'c/6']);
  });
});

describe('ledgerLinesAt', () => {
  it('counts a note hanging past a ledger line with the next one out', () => {
    assert.deepEqual([-6, -5, -2, -1, 0, 8, 9, 10, 12, 14].map(ledgerLinesAt), [3, 3, 1, 1, 0, 0, 1, 1, 2, 3]);
  });
});

describe('getDefaultEnabledNotes', () => {
  it('starts from the staff plus one ledger line', () => {
    const ids = getDefaultEnabledNotes(['treble']);
    assert.equal(ids.length, 13);
    assert.ok(ids.includes('c/4|treble'));
    assert.ok(!ids.includes('b/3|treble'));
  });
});
