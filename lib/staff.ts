import { Clef } from './types';

export const STAFF_LINE_SPACING = 13;

export const STAFF_STEPS: Record<Clef, Record<string, number>> = {
  treble: {
    'c/4': -2, 'd/4': -1,
    'e/4': 0, 'f/4': 1, 'g/4': 2, 'a/4': 3, 'b/4': 4,
    'c/5': 5, 'd/5': 6, 'e/5': 7, 'f/5': 8,
    'g/5': 9, 'a/5': 10,
  },
  bass: {
    'e/2': -2, 'f/2': -1,
    'g/2': 0, 'a/2': 1, 'b/2': 2, 'c/3': 3, 'd/3': 4,
    'e/3': 5, 'f/3': 6, 'g/3': 7, 'a/3': 8,
    'b/3': 9, 'c/4': 10,
  },
};
