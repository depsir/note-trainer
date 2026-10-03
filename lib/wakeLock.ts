'use client';

import { useEffect } from 'react';

/**
 * Holds the screen awake while an exercise is being answered by playing.
 *
 * Reading a piece takes minutes and the screen is never touched in all that
 * time — the only input is the instrument — so the phone's own idle timer
 * would dim the score away halfway through.
 *
 * The lock is a courtesy the browser can refuse (an unsupported engine, an
 * insecure origin, a low battery), and it is dropped on its own whenever the
 * tab stops being visible, so it is taken again on the way back.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let done = false;
    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      if (done || sentinel || document.visibilityState !== 'visible') return;
      try {
        const held = await navigator.wakeLock.request('screen');
        // The exercise may have ended while the request was in flight.
        if (done) {
          void held.release();
          return;
        }
        sentinel = held;
        held.addEventListener('release', () => {
          if (sentinel === held) sentinel = null;
        });
      } catch {
        // Nothing to say to the player: the exercise runs either way, the
        // screen just keeps its usual timeout.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      done = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void sentinel?.release();
      sentinel = null;
    };
  }, [enabled]);
}
