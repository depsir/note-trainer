'use client';

import { useContext, useLayoutEffect, useRef } from 'react';
import { SessionContext } from '@/components/AppHeader';
import { formatTime } from '@/lib/session';

interface SessionHudProps {
  correct: number;
  total: number;
  /** Seconds remaining; ignored when `showTimer` is false */
  timeLeft: number;
  showTimer: boolean;
  onStop: () => void;
  /** Replaces the tally, for modes counted by something other than taps */
  scoreLabel?: string;
}

/**
 * The running session's stop button, score and timer, on top of the page. While it is up,
 * the bar on top hands its way home over to `onStop`.
 */
export default function SessionHud({ correct, total, timeLeft, showTimer, onStop, scoreLabel }: SessionHudProps) {
  const register = useContext(SessionContext);
  const stop = useRef(onStop);

  useLayoutEffect(() => {
    stop.current = onStop;
  });

  useLayoutEffect(() => {
    if (!register) return;
    register(() => stop.current());
    return () => register(null);
  }, [register]);

  return (
    // Held to the top, wherever the exercise below settles, so the thumb finds it in one place
    <div className="flex items-center gap-3 w-full mb-auto">
      <button onClick={onStop} className="text-sm px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors">
        ■ Fine
      </button>
      <span className="ml-auto text-sm font-semibold text-zinc-500 truncate">
        {scoreLabel ?? `${correct}/${total} corrette`}
      </span>
      {showTimer && (
        <span
          role="timer"
          aria-label="Tempo rimasto"
          className={['text-sm font-mono font-bold', timeLeft <= 10 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'].join(' ')}
        >
          {formatTime(timeLeft)}
        </span>
      )}
    </div>
  );
}
