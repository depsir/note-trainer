'use client';

import { useCallback, useMemo, useState } from 'react';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import SpelledNoteButtons from '@/components/SpelledNoteButtons';
import {
  pickRelativeQuestion,
  relativeAnswerId,
  relativeCandidates,
  relativePrompt,
  RelativeQuestion,
  relativeQuestionId,
  RELATIVE_ANSWER_PROMPT,
  RELATIVE_PROMPT_CAPTION,
  RELATIVE_QUESTION_KIND_LABEL,
} from '@/lib/relatives';
import { displaySpelledNoteName } from '@/lib/scales';
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, formatTime, SessionPhase, useSessionClock } from '@/lib/session';
import { ExerciseConfig } from '@/lib/types';

interface RelativesTrainerProps {
  config: ExerciseConfig;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
}

export default function RelativesTrainer({ config, phase, onPhaseChange }: RelativesTrainerProps) {
  const [question, setQuestion] = useState<RelativeQuestion | null>(null);
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

  const pairs = useMemo(() => relativeCandidates(config.relatives.enabledKeys), [config.relatives.enabledKeys]);
  const kinds = config.relatives.questionKinds;
  const ready = pairs.length > 0 && kinds.length > 0;

  const nextQuestion = useCallback((previousId?: string) => {
    if (pairs.length === 0 || kinds.length === 0) return;
    setQuestion(pickRelativeQuestion(pairs, kinds, previousId));
    setFlash(null);
    setWrongAnswerId(null);
  }, [pairs, kinds]);

  const startSession = useCallback(() => {
    setSessionCorrect(0);
    setSessionTotal(0);
    onPhaseChange('playing');
    startClock();
    nextQuestion(undefined);
  }, [nextQuestion, onPhaseChange, startClock]);

  const handleAnswer = useCallback((answerId: string) => {
    if (!question || phase !== 'playing') return;
    const correct = answerId === relativeAnswerId(question);
    setSessionTotal((t) => t + 1);
    if (correct) {
      setSessionCorrect((c) => c + 1);
      setWrongAnswerId(null);
      setFlash('correct');
      const currentId = relativeQuestionId(question);
      setTimeout(() => nextQuestion(currentId), CORRECT_FEEDBACK_DELAY_MS);
    } else {
      setWrongAnswerId(answerId);
      setFlash('wrong');
    }
  }, [question, phase, nextQuestion]);

  if (phase === 'idle') {
    const kindSummary = kinds.map((kind) => RELATIVE_QUESTION_KIND_LABEL[kind]).join(' · ');
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm">{kindSummary || 'Nessuna direzione selezionata'}</p>
          <p className="text-zinc-400 text-sm">
            {config.durationSeconds === 0 ? 'Tempo illimitato' : formatTime(config.durationSeconds)}
            {' · '}{pairs.length} coppie
            {' · '}{config.nameSystem === 'italian' ? 'Do Re Mi' : 'C D E'}
          </p>
        </div>
        <button
          onClick={startSession}
          disabled={!ready}
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
        <div className="text-center">
          <p className={[
            'text-6xl font-black tracking-tight',
            flash === 'correct' ? 'text-green-500' : flash === 'wrong' ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-100',
          ].join(' ')}>
            {displaySpelledNoteName(relativePrompt(question), config.nameSystem)}
          </p>
          <p className="text-sm font-semibold text-zinc-400 mt-2">{RELATIVE_PROMPT_CAPTION[question.kind]}</p>
        </div>
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
        {RELATIVE_ANSWER_PROMPT[question.kind]}
      </p>

      <SpelledNoteButtons
        onSelect={handleAnswer}
        disabled={flash === 'correct'}
        wrongNoteId={wrongAnswerId}
        nameSystem={config.nameSystem}
      />
    </>
  );
}
