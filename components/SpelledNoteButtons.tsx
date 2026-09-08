'use client';

import AnswerButton from '@/components/AnswerButton';
import { SPELLING_ROWS } from '@/lib/fifths';
import { NOTE_LETTERS } from '@/lib/notes';
import { displaySpelledNoteName, SpelledNote, spelledNoteId } from '@/lib/scales';
import { NoteNameSystem } from '@/lib/types';

interface SpelledNoteButtonsProps {
  onSelect: (noteId: string) => void;
  disabled?: boolean;
  wrongNoteId?: string | null;
  nameSystem: NoteNameSystem;
}

/**
 * Every spelling a note can have: the seven letters across, naturals in the middle row,
 * sharps above and flats below since that is the direction each moves the pitch.
 * All 21 cells are always shown — a keypad trimmed to the answers in play would leak which
 * side of the circle the question comes from.
 */
export default function SpelledNoteButtons({
  onSelect,
  disabled,
  wrongNoteId,
  nameSystem,
}: SpelledNoteButtonsProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {SPELLING_ROWS.map((sign) => (
        <div key={sign || 'natural'} className="grid grid-cols-7 gap-1.5">
          {NOTE_LETTERS.map((letter) => {
            const note: SpelledNote = { letter, sign };
            const id = spelledNoteId(note);
            return (
              <AnswerButton
                key={letter}
                compact
                label={displaySpelledNoteName(note, nameSystem)}
                onClick={() => onSelect(id)}
                disabled={disabled}
                wrong={wrongNoteId === id}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
