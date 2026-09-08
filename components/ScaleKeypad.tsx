'use client';

import AnswerButton from '@/components/AnswerButton';
import { SPELLING_ROWS } from '@/lib/fifths';
import { displaySpelledNoteName, ScaleKeypadColumn, SpelledNote, spelledNoteId } from '@/lib/scales';
import { NoteNameSystem } from '@/lib/types';

interface ScaleKeypadProps {
  /** One column per degree, letters rotated onto the tonic */
  columns: ScaleKeypadColumn[];
  /** Notes already locked in, in order — one per column from the left */
  entered: SpelledNote[];
  onSelect: (noteId: string) => void;
  disabled?: boolean;
  wrongNoteId?: string | null;
  nameSystem: NoteNameSystem;
}

/**
 * Scale answer keypad: columns are scale degrees (letters rotated onto the tonic), rows are
 * the accidental (♯ / natural / ♭, sharps on top since they raise the pitch). Degrees already
 * answered stay green and go inert; the degree number of the one being asked is highlighted.
 * Each letter appears once in a diatonic scale, so a lit cell is never ambiguous.
 */
export default function ScaleKeypad({
  columns,
  entered,
  onSelect,
  disabled,
  wrongNoteId,
  nameSystem,
}: ScaleKeypadProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="grid grid-cols-7 gap-1.5">
        {columns.map((column, index) => (
          <span
            key={column.degree}
            className={[
              'text-center text-[11px] font-bold tabular-nums',
              index === entered.length ? 'text-indigo-600' : 'text-zinc-400 dark:text-zinc-600',
            ].join(' ')}
          >
            {column.degree}
          </span>
        ))}
      </div>

      {SPELLING_ROWS.map((sign) => (
        <div key={sign || 'natural'} className="grid grid-cols-7 gap-1.5">
          {columns.map((column, index) => {
            const note: SpelledNote = { letter: column.letter, sign };
            const id = spelledNoteId(note);
            const answered = index < entered.length;
            return (
              <AnswerButton
                key={column.degree}
                compact
                label={displaySpelledNoteName(note, nameSystem)}
                onClick={() => onSelect(id)}
                disabled={disabled || answered}
                correct={answered && entered[index].sign === sign}
                wrong={wrongNoteId === id}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
