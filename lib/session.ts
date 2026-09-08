'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

export type SessionPhase = 'idle' | 'playing' | 'finished';

export type FlashType = 'correct' | 'wrong' | null;

export const CORRECT_FEEDBACK_DELAY_MS = 300;

/** Longer pause once a whole sequence lands (a full scale), so the answer can be read back */
export const SEQUENCE_FEEDBACK_DELAY_MS = 800;

const TICK_MS = 250;

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function remainingSeconds(deadline: number | null): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export interface SessionClock {
  /** Whole seconds left; 0 when the clock is stopped or the session is unlimited */
  timeLeft: number;
  start: () => void;
  stop: () => void;
}

/**
 * Wall-clock session timer. `durationSeconds === 0` means unlimited: nothing ticks and
 * `onExpire` never fires. Deriving the remaining time from a deadline instead of
 * decrementing a counter keeps the countdown honest when a phone suspends the tab.
 */
export function useSessionClock(durationSeconds: number, onExpire: () => void): SessionClock {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [, tick] = useReducer((count: number) => count + 1, 0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadline === null) return;

    const interval = setInterval(() => {
      if (Date.now() < deadline) {
        tick();
        return;
      }
      clearInterval(interval);
      setDeadline(null);
      onExpireRef.current();
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [deadline]);

  const start = useCallback(() => {
    setDeadline(durationSeconds > 0 ? Date.now() + durationSeconds * 1000 : null);
  }, [durationSeconds]);

  const stop = useCallback(() => setDeadline(null), []);

  return { timeLeft: remainingSeconds(deadline), start, stop };
}
