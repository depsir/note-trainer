'use client';

import { displaySpelledNoteName, SCALE_DEGREES, SpelledNote } from '@/lib/scales';
import { NoteNameSystem } from '@/lib/types';

interface ScaleSequenceProps {
  /** Notes answered so far, in order */
  entered: SpelledNote[];
  nameSystem: NoteNameSystem;
}

/**
 * The scale as it is being spelled out: answered degrees read left to right, the degree
 * being asked is an empty outlined slot. Seven columns, so it lines up with the keypad below.
 */
export default function ScaleSequence({ entered, nameSystem }: ScaleSequenceProps) {
  return (
    <div className="grid grid-cols-7 gap-1 w-full">
      {Array.from({ length: SCALE_DEGREES }, (_, index) => {
        const note = entered[index];
        if (note) {
          return (
            <span
              key={index}
              className="h-8 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 text-sm font-bold"
            >
              {displaySpelledNoteName(note, nameSystem)}
            </span>
          );
        }
        const isCurrent = index === entered.length;
        return (
          <span
            key={index}
            className={[
              'h-8 rounded-lg border-2 border-dashed',
              isCurrent ? 'border-indigo-400' : 'border-zinc-200 dark:border-zinc-800',
            ].join(' ')}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
