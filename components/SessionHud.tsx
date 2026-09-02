'use client';

import { formatTime } from '@/lib/session';

interface SessionHudProps {
  correct: number;
  total: number;
  /** Seconds remaining; ignored when `showTimer` is false */
  timeLeft: number;
  showTimer: boolean;
  onStop: () => void;
}

export default function SessionHud({ correct, total, timeLeft, showTimer, onStop }: SessionHudProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <span className="text-sm font-semibold text-zinc-500">
        {correct}/{total} corrette
      </span>
      <div className="flex items-center gap-3">
        {showTimer && (
          <span className={['text-sm font-mono font-bold', timeLeft <= 10 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'].join(' ')}>
            {formatTime(timeLeft)}
          </span>
        )}
        <button onClick={onStop} className="text-sm px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors">
          ■ Fine
        </button>
      </div>
    </div>
  );
}
