'use client';

import ExerciseOptions from '@/components/ExerciseOptions';
import { isNoteDrillMode, noteDrill } from '@/lib/exercises';
import { ALL_NOTES, noteId } from '@/lib/notes';
import { intervalBuildCandidates } from '@/lib/intervalBuild';
import { scaleCandidates } from '@/lib/scales';
import { ExerciseConfig, TrainingMode } from '@/lib/types';

interface ExerciseSetupProps {
  mode: TrainingMode;
  config: ExerciseConfig;
  onChange: (config: ExerciseConfig) => void;
  onStart: () => void;
}

/** Why a session could not start with these settings, or null when it can. */
function blocker(mode: TrainingMode, config: ExerciseConfig): string | null {
  if (isNoteDrillMode(mode)) {
    const drill = noteDrill(mode, config);
    const any = ALL_NOTES.some((n) => drill.clefs.includes(n.clef) && drill.enabledNotes.includes(noteId(n)));
    return any ? null : 'Nessuna nota selezionata nelle chiavi attive.';
  }
  switch (mode) {
    case 'interval-build': {
      const { enabledRoots, enabledDegrees, qualityScope } = config.intervalBuild;
      return intervalBuildCandidates(enabledRoots, enabledDegrees, qualityScope).length > 0
        ? null
        : 'Nessun intervallo possibile con queste note e questi gradi.';
    }
    case 'scales':
      return scaleCandidates(config.scales.enabledTonics, config.scales.enabledTypes).length > 0
        ? null
        : 'Nessuna scala possibile con queste toniche.';
    default:
      return null;
  }
}

/**
 * The page an exercise opens on: how it is set up — remembered from last
 * time, so starting again is a single tap — and the button that starts it.
 */
export default function ExerciseSetup({ mode, config, onChange, onStart }: ExerciseSetupProps) {
  const blocked = blocker(mode, config);

  return (
    <div className="w-full flex flex-col gap-6">
      <ExerciseOptions mode={mode} config={config} onChange={onChange} />

      {/* Kept in reach however far down the options go */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-zinc-50 via-zinc-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent">
        {blocked && <p className="text-sm text-center text-red-600 dark:text-red-400 mb-2">{blocked}</p>}
        <button
          onClick={onStart}
          disabled={blocked !== null}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          Inizia
        </button>
      </div>
    </div>
  );
}
