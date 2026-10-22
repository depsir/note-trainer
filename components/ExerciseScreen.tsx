'use client';

import { ComponentType, useCallback, useState } from 'react';
import AppHeader, { SessionContext } from '@/components/AppHeader';
import ExerciseSetup from '@/components/ExerciseSetup';
import FifthsTrainer from '@/components/FifthsTrainer';
import IntervalBuildTrainer from '@/components/IntervalBuildTrainer';
import IntervalTrainer from '@/components/IntervalTrainer';
import NotesTrainer from '@/components/NotesTrainer';
import RelativesTrainer from '@/components/RelativesTrainer';
import ScalesTrainer from '@/components/ScalesTrainer';
import SheetTrainer from '@/components/SheetTrainer';
import { getExercise, isNoteDrillMode, noteDrill } from '@/lib/exercises';
import { useNoteStats } from '@/lib/storage';
import { NoteTrainerProps, TrainerProps } from '@/lib/session';
import { NoteDrillMode, TrainingMode } from '@/lib/types';

const TRAINERS: Record<Exclude<TrainingMode, NoteDrillMode>, ComponentType<TrainerProps>> = {
  fifths: FifthsTrainer,
  relatives: RelativesTrainer,
  intervals: IntervalTrainer,
  'interval-build': IntervalBuildTrainer,
  scales: ScalesTrainer,
};

/** One exercise: its setup screen, then the session. */
export default function ExerciseScreen({ mode }: { mode: TrainingMode }) {
  const { config, hydrated, updateConfig } = useNoteStats();
  const [running, setRunning] = useState(false);
  /** Bumped to remount the trainer, which is what starts a fresh session */
  const [runId, setRunId] = useState(0);
  /** How to stop the session under way; null on the setup screen and the summary */
  const [stopSession, setStopSession] = useState<(() => void) | null>(null);
  const registerSession = useCallback((stop: (() => void) | null) => setStopSession(() => stop), []);

  const drill = isNoteDrillMode(mode) ? noteDrill(mode, config) : null;
  const sheet = drill !== null && drill.notesAtOnce > 1;
  // A written piece is read ahead, so on a wide screen it gets the room to show more of it.
  const wide = running && sheet;

  const trainerProps: TrainerProps = {
    config,
    onExit: () => setRunning(false),
  };

  let trainer = null;
  if (running) {
    if (drill) {
      const NoteTrainer: ComponentType<NoteTrainerProps> = sheet ? SheetTrainer : NotesTrainer;
      trainer = <NoteTrainer key={runId} drill={drill} {...trainerProps} />;
    } else if (!isNoteDrillMode(mode)) {
      const Trainer = TRAINERS[mode];
      trainer = <Trainer key={runId} {...trainerProps} />;
    }
  }

  return (
    // A sheet on a wide screen is held to the window, so the score gives way rather than
    // pushing the answer buttons off the bottom.
    <div className={['min-h-dvh bg-zinc-50 dark:bg-zinc-950 flex flex-col', wide ? 'lg:h-dvh' : ''].join(' ')}>
      {/* While a session runs, a phone gives it the whole screen; a wide one keeps the bar,
          whose way home stops the session first, as the stop button does. */}
      <AppHeader
        title={getExercise(mode).title}
        onLeave={stopSession ?? undefined}
        hideOnPhone={stopSession !== null}
      />

      <main
        className={[
          'flex-1 flex flex-col items-center px-4 py-6 gap-6 mx-auto w-full',
          // Without the bar, the page itself keeps clear of the phone's status bar
          stopSession ? 'pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-6' : '',
          running ? 'justify-center' : '',
          wide ? 'max-w-lg lg:max-w-5xl lg:min-h-0' : 'max-w-lg',
        ].join(' ')}
      >
        {!hydrated ? (
          <p className="text-zinc-400 m-auto">Caricamento…</p>
        ) : running ? (
          <SessionContext.Provider value={registerSession}>
            {trainer}
            {/* Shares the room left under the stop button with it, so the exercise sits centred */}
            {stopSession && <div aria-hidden className="mt-auto" />}
          </SessionContext.Provider>
        ) : (
          <ExerciseSetup
            mode={mode}
            config={config}
            onChange={updateConfig}
            onStart={() => {
              setRunId((id) => id + 1);
              setRunning(true);
            }}
          />
        )}
      </main>
    </div>
  );
}
