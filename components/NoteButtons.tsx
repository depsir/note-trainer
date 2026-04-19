'use client';

import { displayNoteName } from '@/lib/notes';
import { NoteNameSystem } from '@/lib/types';

interface NoteButtonsProps {
  onSelect: (letter: string) => void;
  disabled?: boolean;
  lastAnswer?: { letter: string; correct: boolean } | null;
  nameSystem: NoteNameSystem;
}

const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

export default function NoteButtons({ onSelect, disabled, lastAnswer, nameSystem }: NoteButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full max-w-sm mx-auto">
      {LETTER_ORDER.map((letter) => {
        const isWrong = lastAnswer && !lastAnswer.correct && lastAnswer.letter === letter;
        return (
          <button
            key={letter}
            onClick={() => !disabled && onSelect(letter)}
            disabled={disabled}
            className={[
              'h-14 rounded-2xl text-xl font-bold transition-all duration-150 select-none',
              'active:scale-95 touch-manipulation',
              isWrong
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-2 border-zinc-200 dark:border-zinc-700',
              disabled && !isWrong ? 'opacity-60' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700',
            ].join(' ')}
          >
            {displayNoteName(letter, nameSystem)}
          </button>
        );
      })}
    </div>
  );
}
