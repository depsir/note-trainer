'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Settings } from 'lucide-react';
import ConfigPanel from '@/components/ConfigPanel';
import FifthsTrainer from '@/components/FifthsTrainer';
import IntervalTrainer from '@/components/IntervalTrainer';
import ModeSelector from '@/components/ModeSelector';
import NotesTrainer from '@/components/NotesTrainer';
import RelativesTrainer from '@/components/RelativesTrainer';
import ScalesTrainer from '@/components/ScalesTrainer';
import { useNoteStats } from '@/lib/storage';
import { SessionPhase } from '@/lib/session';
import { TrainingMode } from '@/lib/types';

export default function HomePage() {
  const { config, hydrated, updateConfig } = useNoteStats();
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [showConfig, setShowConfig] = useState(false);

  const selectMode = useCallback(
    (mode: TrainingMode) => updateConfig({ ...config, mode }),
    [config, updateConfig]
  );

  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-black tracking-tight text-indigo-600">🎵 Note Coach</h1>
        <div className="flex gap-2">
          <Link href="/stats" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <BarChart2 size={20} />
          </Link>
          <button onClick={() => setShowConfig(true)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 max-w-lg mx-auto w-full">
        {phase === 'idle' && <ModeSelector mode={config.mode} onChange={selectMode} />}

        {config.mode === 'fifths' ? (
          <FifthsTrainer config={config} phase={phase} onPhaseChange={setPhase} />
        ) : config.mode === 'scales' ? (
          <ScalesTrainer config={config} phase={phase} onPhaseChange={setPhase} />
        ) : config.mode === 'relatives' ? (
          <RelativesTrainer config={config} phase={phase} onPhaseChange={setPhase} />
        ) : config.mode === 'intervals' ? (
          <IntervalTrainer config={config} phase={phase} onPhaseChange={setPhase} />
        ) : (
          <NotesTrainer config={config} phase={phase} onPhaseChange={setPhase} />
        )}
      </main>

      {showConfig && (
        <ConfigPanel config={config} onSave={updateConfig} onClose={() => setShowConfig(false)} isPlaying={phase === 'playing'} />
      )}
    </div>
  );
}
