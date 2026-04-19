'use client';

import { useCallback, useEffect, useState } from 'react';
import { AllNoteStats, ExerciseConfig } from './types';
import { ALL_NOTES, getDefaultEnabledNotes, noteId } from './notes';

const STATS_KEY = 'note-coach-stats';
const CONFIG_KEY = 'note-coach-config';

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
}

export function useNoteStats() {
  const [stats, setStats] = useState<AllNoteStats>({});
  const [config, setConfig] = useState<ExerciseConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedStats = loadJSON<AllNoteStats>(STATS_KEY, {});
    const savedConfig = loadJSON<ExerciseConfig>(CONFIG_KEY, DEFAULT_CONFIG);
    // Merge with defaults to handle new keys from updates
    const mergedConfig: ExerciseConfig = { ...DEFAULT_CONFIG, ...savedConfig };
    setStats(savedStats);
    setConfig(mergedConfig);
    setHydrated(true);
  }, []);

  const updateStats = useCallback((newStats: AllNoteStats) => {
    setStats(newStats);
    saveJSON(STATS_KEY, newStats);
  }, []);

  const updateConfig = useCallback((newConfig: ExerciseConfig) => {
    setConfig(newConfig);
    saveJSON(CONFIG_KEY, newConfig);
  }, []);

  const resetStats = useCallback(() => {
    const empty: AllNoteStats = {};
    setStats(empty);
    saveJSON(STATS_KEY, empty);
  }, []);

  const getAllNoteIds = useCallback(() => {
    return ALL_NOTES.map((n) => noteId(n));
  }, []);

  return { stats, config, hydrated, updateStats, updateConfig, resetStats, getAllNoteIds };
}
