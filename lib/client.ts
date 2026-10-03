'use client';

import { useSyncExternalStore } from 'react';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Both halves are built once per query: `useSyncExternalStore` resubscribes whenever they change identity. */
function mediaQueryStore(query: string) {
  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => onStoreChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  };

  const getSnapshot = () => typeof window !== 'undefined' && window.matchMedia(query).matches;

  return { subscribe, getSnapshot };
}

const darkMode = mediaQueryStore(DARK_MODE_QUERY);
const reducedMotion = mediaQueryStore(REDUCED_MOTION_QUERY);

function subscribeToNothing() {
  return () => undefined;
}

export function usePrefersDark() {
  return useSyncExternalStore(darkMode.subscribe, darkMode.getSnapshot, () => false);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(reducedMotion.subscribe, reducedMotion.getSnapshot, () => false);
}

export function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
