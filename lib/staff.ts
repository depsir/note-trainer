import type { Clef } from './types.ts';

export const STAFF_LINE_SPACING = 13;

/**
 * Each note's height on the staff, in steps above the bottom line: the lines are the
 * even steps 0–8, ledger lines carry on at -2, -4, -6 below and 10, 12, 14 above.
 */
export const STAFF_STEPS: Record<Clef, Record<string, number>> = {
  treble: {
    'f/3': -6, 'g/3': -5, 'a/3': -4, 'b/3': -3, 'c/4': -2, 'd/4': -1,
    'e/4': 0, 'f/4': 1, 'g/4': 2, 'a/4': 3, 'b/4': 4,
    'c/5': 5, 'd/5': 6, 'e/5': 7, 'f/5': 8,
    'g/5': 9, 'a/5': 10, 'b/5': 11, 'c/6': 12, 'd/6': 13, 'e/6': 14,
  },
  bass: {
    'a/1': -6, 'b/1': -5, 'c/2': -4, 'd/2': -3, 'e/2': -2, 'f/2': -1,
    'g/2': 0, 'a/2': 1, 'b/2': 2, 'c/3': 3, 'd/3': 4,
    'e/3': 5, 'f/3': 6, 'g/3': 7, 'a/3': 8,
    'b/3': 9, 'c/4': 10, 'd/4': 11, 'e/4': 12, 'f/4': 13, 'g/4': 14,
  },
};
