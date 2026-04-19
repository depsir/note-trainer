'use client';

import { useSyncExternalStore } from 'react';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function subscribeToColorScheme(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
  const handleChange = () => onStoreChange();
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}

function getDarkModeSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(DARK_MODE_QUERY).matches;
}

function subscribeToNothing() {
  return () => undefined;
}

export function usePrefersDark() {
  return useSyncExternalStore(subscribeToColorScheme, getDarkModeSnapshot, () => false);
}

export function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
