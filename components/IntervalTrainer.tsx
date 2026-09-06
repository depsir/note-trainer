'use client';

import { useCallback, useState } from 'react';
import IntervalButtons from '@/components/IntervalButtons';
import IntervalStaffDisplay from '@/components/IntervalStaffDisplay';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import {
  buildIntervalGrid,
  displayEndpointName,
  gridRowsForMode,
  IntervalQuestion,
  intervalQuestionId,
  pickIntervalQuestion,
  questionAnswerId,
  rootVexKey,
  targetVexKey,
} from '@/lib/intervals';
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, formatTime, SessionPhase, useSessionClock } from '@/lib/session';
import { ExerciseConfig } from '@/lib/types';

interface IntervalTrainerProps {
  config: ExerciseConfig;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
}

export default function IntervalTrainer({ config, phase, onPhaseChange }: IntervalTrainerProps) {
  const [question, setQuestion] = useState<IntervalQuestion | null>(null);
  const [flash, setFlash] = useState<FlashType>(null);
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  const expire = useCallback(() => onPhaseChange('finished'), [onPhaseChange]);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(config.durationSeconds, expire);
  const finish = useCallback(() => {
    stopClock();
    onPhaseChange('finished');
  }, [stopClock, onPhaseChange]);

  const gridRows = buildIntervalGrid(gridRowsForMode(config.mode));
  const enabledDegrees = config.intervals.enabledDegrees;

  const nextQuestion = useCallback((previousId?: string) => {
    if (enabledDegrees.length === 0) return;
    setQuestion(pickIntervalQuestion(config.clefs, enabledDegrees, config.mode, previousId));
    setFlash(null);
    setWrongAnswerId(null);
  }, [enabledDegrees, config.clefs, config.mode]);

  const startSession = useCallback(() => {
    setSessionCorrect(0);
    setSessionTotal(0);
    onPhaseChange('playing');
    startClock();
    nextQuestion(undefined);
  }, [nextQuestion, onPhaseChange, startClock]);

  const handleAnswer = useCallback((answerId: string) => {
    if (!question || phase !== 'playing') return;
    const correct = answerId === questionAnswerId(question);
    setSessionTotal((t) => t + 1);
    if (correct) {
      setSessionCorrect((c) => c + 1);
      setWrongAnswerId(null);
      setFlash('correct');
      const currentId = intervalQuestionId(question);
      setTimeout(() => nextQuestion(currentId), CORRECT_FEEDBACK_DELAY_MS);
    } else {
      setWrongAnswerId(answerId);
      setFlash('wrong');
    }
  }, [question, phase, nextQuestion]);

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm">
            {config.mode === 'intervals-major' ? 'Solo intervalli giusti e maggiori' : 'Tutti gli intervalli, fino a diminuiti/aumentati'}
          </p>
          <p className="text-zinc-400 text-sm">
            {config.durationSeconds === 0 ? 'Tempo illimitato' : formatTime(config.durationSeconds)}
            {' · '}{enabledDegrees.length} gradi
            {' · '}{config.intervals.presentation === 'staff' ? 'Pentagramma' : 'Nomi delle note'}
          </p>
        </div>
        <button
          onClick={startSession}
          disabled={enabledDegrees.length === 0}
          className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          Inizia
        </button>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={sessionTotal}
        onRestart={startSession}
        onHome={() => onPhaseChange('idle')}
      />
    );
  }

  if (!question) return null;

  const isStaff = config.intervals.presentation === 'staff';

  return (
    <>
      <SessionHud
        correct={sessionCorrect}
        total={sessionTotal}
        timeLeft={timeLeft}
        showTimer={config.durationSeconds > 0}
        onStop={finish}
      />

      <div className="relative w-full min-h-52 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
        {isStaff ? (
          <div className="w-full">
            <IntervalStaffDisplay
              rootVexKey={rootVexKey(question)}
              targetVexKey={targetVexKey(question)}
              clef={question.clef}
              flash={flash}
            />
          </div>
        ) : (
          <p className={[
            'text-4xl font-black tracking-tight text-center',
            flash === 'correct' ? 'text-green-500' : flash === 'wrong' ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-100',
          ].join(' ')}>
            {displayEndpointName(question.root, config.nameSystem)}
            {' – '}
            {displayEndpointName(question.target, config.nameSystem)}
          </p>
        )}
        {flash && (
          <div className={[
            'absolute top-3 right-4 pointer-events-none text-3xl font-black leading-none',
            flash === 'correct' ? 'text-green-500' : 'text-red-500',
          ].join(' ')}>
            {flash === 'correct' ? '✓' : '✗'}
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-zinc-500 -mt-2 text-center">
        Che intervallo è? {isStaff ? (question.clef === 'treble' ? '(Violino)' : '(Basso)') : ''}
      </p>

      <IntervalButtons
        rows={gridRows}
        onSelect={handleAnswer}
        disabled={flash === 'correct'}
        wrongAnswerId={wrongAnswerId}
      />
    </>
  );
}
