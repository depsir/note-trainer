'use client';

import { ReactNode } from 'react';

interface AnswerButtonProps {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Marks the answer the user just got wrong */
  wrong?: boolean;
  /** Marks an answer already locked in as correct — stays lit for the rest of the question */
  correct?: boolean;
  /** Denser sizing for the 7-column keypads */
  compact?: boolean;
}

export default function AnswerButton({ label, onClick, disabled, wrong, correct, compact }: AnswerButtonProps) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={[
        // w-full: a <button> shrink-wraps unless it is a stretched grid item
        'w-full flex items-center justify-center font-bold transition-all duration-150 select-none',
        'active:scale-95 touch-manipulation',
        compact ? 'h-12 rounded-xl text-base' : 'h-14 rounded-2xl text-xl',
        correct
          ? 'bg-green-500 text-white border-2 border-green-500'
          : wrong
            ? 'bg-red-500 text-white border-2 border-red-500'
            : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-2 border-zinc-200 dark:border-zinc-700',
        // No hover tint or dimming over a feedback fill — either would repaint it
        correct || wrong ? '' : disabled ? 'opacity-60' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
