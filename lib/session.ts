'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteDrill } from './exercises.ts';
import type { ExerciseConfig } from './types.ts';

/** A session starts the moment its trainer mounts; the setup screen comes before it. */
export type SessionPhase = 'playing' | 'finished';

/** What the exercise page hands every trainer */
export interface TrainerProps {
  config: ExerciseConfig;
  /** Back to the exercise's setup screen */
  onExit: () => void;
}

/** The note-reading trainers are handed their exercise's settings already worked out */
export interface NoteTrainerProps extends TrainerProps {
  drill: NoteDrill;
}

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

/** Runs `start` once, when the trainer first mounts: mounting it is what starts the session. */
export function useStartOnMount(start: () => void): void {
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current();
  }, []);
}

export interface SessionClock {
  /** Whole seconds left; 0 when the clock is stopped or the session is unlimited */
  timeLeft: number;
  start: () => void;
  stop: () => void;
}

/**
 * Wall-clock session timer. `durationSeconds === 0` means unlimited: nothing ticks and
 * `onExpire` never fires. Counting down to a deadline instead of decrementing a counter
 * keeps it honest when a phone suspends the tab.
 */
export function useSessionClock(durationSeconds: number, onExpire: () => void): SessionClock {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const deadlineRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (deadlineRef.current === null) return;

      if (now < deadlineRef.current) {
        setTimeLeft(Math.ceil((deadlineRef.current - now) / 1000));
        return;
      }
      clearInterval(interval);
      deadlineRef.current = null;
      setRunning(false);
      setTimeLeft(0);
      onExpireRef.current();
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [running]);

  const start = useCallback(() => {
    const timed = durationSeconds > 0;
    deadlineRef.current = timed ? Date.now() + durationSeconds * 1000 : null;
    setTimeLeft(timed ? durationSeconds : 0);
    setRunning(timed);
  }, [durationSeconds]);

  const stop = useCallback(() => {
    deadlineRef.current = null;
    setRunning(false);
    setTimeLeft(0);
  }, []);

  return { timeLeft, start, stop };
}
