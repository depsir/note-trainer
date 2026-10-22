'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import ScaleKeypad from '@/components/ScaleKeypad';
import ScaleSequence from '@/components/ScaleSequence';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import {
  displaySpelledNoteName,
  pickScaleQuestion,
  SCALE_DEGREES,
  SCALE_TYPE_CAPTION,
  scaleCandidates,
  scaleKeypadColumns,
  ScaleQuestion,
  scaleQuestionId,
  SpelledNote,
  spelledNoteId,
} from '@/lib/scales';
import { SEQUENCE_FEEDBACK_DELAY_MS, SessionPhase, TrainerProps, useSessionClock, useStartOnMount } from '@/lib/session';

export default function ScalesTrainer({ config, onExit }: TrainerProps) {
  const [phase, setPhase] = useState<SessionPhase>('playing');
  const [question, setQuestion] = useState<ScaleQuestion | null>(null);
  const [entered, setEntered] = useState<SpelledNote[]>([]);
  const [wrongNoteId, setWrongNoteId] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [scalesDone, setScalesDone] = useState(0);
  const [scalesPerfect, setScalesPerfect] = useState(0);
  // Per-question, not per-tap: a scale only counts as perfect if it took no wrong note at all
  const missedRef = useRef(false);

  const expire = useCallback(() => setPhase('finished'), []);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(config.scales.durationSeconds, expire);
  const finish = useCallback(() => {
    stopClock();
    setPhase('finished');
  }, [stopClock]);

  const candidates = useMemo(
    () => scaleCandidates(config.scales.enabledTonics, config.scales.enabledTypes),
    [config.scales.enabledTonics, config.scales.enabledTypes]
  );

  const nextQuestion = useCallback((previousId?: string) => {
    if (candidates.length === 0) return;
    setQuestion(pickScaleQuestion(candidates, previousId));
    setEntered([]);
    setWrongNoteId(null);
    missedRef.current = false;
  }, [candidates]);

  const startSession = useCallback(() => {
    setSessionCorrect(0);
    setSessionTotal(0);
    setScalesDone(0);
    setScalesPerfect(0);
    setPhase('playing');
    startClock();
    nextQuestion(undefined);
  }, [nextQuestion, startClock]);

  useStartOnMount(startSession);

  const complete = entered.length === SCALE_DEGREES;

  const handleAnswer = useCallback((noteId: string) => {
    if (!question || phase !== 'playing') return;
    const expected = question.notes[entered.length];
    if (!expected) return; // scale already complete, waiting on the next question

    setSessionTotal((t) => t + 1);

    if (noteId !== spelledNoteId(expected)) {
      missedRef.current = true;
      setWrongNoteId(noteId);
      return;
    }

    setSessionCorrect((c) => c + 1);
    setWrongNoteId(null);
    const next = [...entered, expected];
    setEntered(next);

    if (next.length === SCALE_DEGREES) {
      setScalesDone((d) => d + 1);
      if (!missedRef.current) setScalesPerfect((p) => p + 1);
      const currentId = scaleQuestionId(question);
      setTimeout(() => nextQuestion(currentId), SEQUENCE_FEEDBACK_DELAY_MS);
    }
  }, [question, phase, entered, nextQuestion]);

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={sessionTotal}
        onRestart={startSession}
        onSettings={onExit}
        detail={scalesDone > 0 ? `${scalesPerfect} scale su ${scalesDone} senza errori` : undefined}
      />
    );
  }

  if (!question) return null;

  return (
    <>
      <SessionHud
        correct={sessionCorrect}
        total={sessionTotal}
        timeLeft={timeLeft}
        showTimer={config.scales.durationSeconds > 0}
        onStop={finish}
      />

      <div className="relative w-full min-h-52 flex flex-col items-center justify-center gap-5 bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <p className={[
            'text-6xl font-black tracking-tight',
            complete ? 'text-green-500' : 'text-zinc-800 dark:text-zinc-100',
          ].join(' ')}>
            {displaySpelledNoteName(question.tonic, config.nameSystem)}
          </p>
          <p className="text-sm font-semibold text-zinc-400 mt-2">{SCALE_TYPE_CAPTION[question.type]}</p>
        </div>
        <ScaleSequence entered={entered} nameSystem={config.nameSystem} />
        {/* Only the finished scale gets a badge — a wrong note is already marked red on its key */}
        {complete && (
          <div className="absolute top-3 right-4 pointer-events-none text-3xl font-black leading-none text-green-500">
            ✓
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-zinc-500 -mt-2 text-center">
        {complete ? 'Scala completa!' : `Nota ${entered.length + 1} di ${SCALE_DEGREES}`}
      </p>

      <ScaleKeypad
        columns={scaleKeypadColumns(question.tonic)}
        entered={entered}
        onSelect={handleAnswer}
        disabled={complete}
        wrongNoteId={wrongNoteId}
        nameSystem={config.nameSystem}
      />
    </>
  );
}
