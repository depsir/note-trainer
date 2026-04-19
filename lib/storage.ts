'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useHydrated } from './client';
import { AllNoteStats, ExerciseConfig } from './types';
import { ALL_NOTES, getDefaultEnabledNotes, noteId } from './notes';

const STATS_KEY = 'note-coach-stats';
const CONFIG_KEY = 'note-coach-config';
const STORAGE_EVENT = 'note-coach-storage';
const EMPTY_STATS: AllNoteStats = {};

const DEFAULT_CONFIG: ExerciseConfig = {
  durationSeconds: 3 * 60,
  clefs: ['treble', 'bass'],
  enabledNotes: getDefaultEnabledNotes(['treble', 'bass']),
  useAdaptive: true,
  nameSystem: 'italian',
};

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent<string>(STORAGE_EVENT, { detail: key }));
}

let cachedStatsRaw: string | null | undefined;
let cachedStatsValue: AllNoteStats = EMPTY_STATS;
let cachedConfigRaw: string | null | undefined;
let cachedConfigValue: ExerciseConfig = DEFAULT_CONFIG;

function subscribeToStorage(targetKey: string) {
  return (onStoreChange: () => void) => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleChange = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key && event.key !== targetKey) return;
      } else if (event instanceof CustomEvent && event.detail !== targetKey) {
        return;
      }

      onStoreChange();
    };

    window.addEventListener('storage', handleChange);
    window.addEventListener(STORAGE_EVENT, handleChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleChange);
      window.removeEventListener(STORAGE_EVENT, handleChange as EventListener);
    };
  };
}

function getStatsSnapshot() {
  if (typeof window === 'undefined') return EMPTY_STATS;

  const raw = localStorage.getItem(STATS_KEY);
  if (raw === cachedStatsRaw) return cachedStatsValue;

  cachedStatsRaw = raw;
  cachedStatsValue = raw ? loadJSON<AllNoteStats>(STATS_KEY, EMPTY_STATS) : EMPTY_STATS;
  return cachedStatsValue;
}

function getConfigSnapshot() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  const raw = localStorage.getItem(CONFIG_KEY);
  if (raw === cachedConfigRaw) return cachedConfigValue;

  cachedConfigRaw = raw;
  const savedConfig = raw ? loadJSON<ExerciseConfig>(CONFIG_KEY, DEFAULT_CONFIG) : DEFAULT_CONFIG;
  cachedConfigValue = { ...DEFAULT_CONFIG, ...savedConfig };
  return cachedConfigValue;
}

export function useNoteStats() {
  const hydrated = useHydrated();
  const stats = useSyncExternalStore(subscribeToStorage(STATS_KEY), getStatsSnapshot, () => EMPTY_STATS);
  const config = useSyncExternalStore(subscribeToStorage(CONFIG_KEY), getConfigSnapshot, () => DEFAULT_CONFIG);

  const updateStats = useCallback((newStats: AllNoteStats) => {
    saveJSON(STATS_KEY, newStats);
  }, []);

  const updateConfig = useCallback((newConfig: ExerciseConfig) => {
    saveJSON(CONFIG_KEY, newConfig);
  }, []);

  const resetStats = useCallback(() => {
    saveJSON(STATS_KEY, EMPTY_STATS);
  }, []);

  const getAllNoteIds = useCallback(() => {
    return ALL_NOTES.map((n) => noteId(n));
  }, []);

  return { stats, config, hydrated, updateStats, updateConfig, resetStats, getAllNoteIds };
}
