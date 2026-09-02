'use client';

import { useCallback, useMemo, useState } from 'react';
import AccidentalCountButtons from '@/components/AccidentalCountButtons';
import KeyButtons from '@/components/KeyButtons';
import KeySignatureDisplay from '@/components/KeySignatureDisplay';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import {
  availableAccidentalTypes,
  displayKeyName,
  FifthsQuestion,
  keyGridForPool,
  MAJOR_KEYS,
  pickQuestion,
  questionAnswerId,
  questionId,
  QUESTION_KIND_LABEL,
} from '@/lib/fifths';
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, formatTime, SessionPhase, useSessionClock } from '@/lib/session';
import { ExerciseConfig } from '@/lib/types';

interface FifthsTrainerProps {
  config: ExerciseConfig;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
}

export default function FifthsTrainer({ config, phase, onPhaseChange }: FifthsTrainerProps) {
  const [question, setQuestion] = useState<FifthsQuestion | null>(null);
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

  const keys = useMemo(
    () => MAJOR_KEYS.filter((key) => config.fifths.enabledKeys.includes(key.id)),
    [config.fifths.enabledKeys]
  );
  const keyGrid = useMemo(() => keyGridForPool(keys), [keys]);
  const countTypes = useMemo(() => availableAccidentalTypes(keys), [keys]);

  const nextQuestion = useCallback((previousId?: string) => {
    if (keys.length === 0 || config.fifths.questionKinds.length === 0) return;
    setQuestion(pickQuestion(keys, config.fifths.questionKinds, config.clefs, previousId));
    setFlash(null);
    setWrongAnswerId(null);
  }, [keys, config.fifths.questionKinds, config.clefs]);

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
      const currentId = questionId(question);
      setTimeout(() => nextQuestion(currentId), CORRECT_FEEDBACK_DELAY_MS);
    } else {
      setWrongAnswerId(answerId);
      setFlash('wrong');
    }
  }, [question, phase, nextQuestion]);

  if (phase === 'idle') {
    const kindSummary = config.fifths.questionKinds.map((kind) => QUESTION_KIND_LABEL[kind]).join(' · ');
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm">{kindSummary || 'Nessuna domanda selezionata'}</p>
          <p className="text-zinc-400 text-sm">
            {config.durationSeconds === 0 ? 'Tempo illimitato' : formatTime(config.durationSeconds)}
            {' · '}{keys.length} tonalità
            {' · '}{config.nameSystem === 'italian' ? 'Do Re Mi' : 'C D E'}
          </p>
        </div>
        <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-[19rem]">
            <KeySignatureDisplay keySpec="A" clef="treble" />
          </div>
        </div>
        <button
          onClick={startSession}
          disabled={keys.length === 0 || config.fifths.questionKinds.length === 0}
          className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          Inizia
        </button>
      </div>
    );
  }

  if (phase === 'finished') {
    return <SessionSummary correct={sessionCorrect} total={sessionTotal} onRestart={startSession} />;
  }

  if (!question) return null;

  const isSignatureQuestion = question.kind === 'signature-to-key';

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
        {isSignatureQuestion ? (
          <div className="mx-auto w-full max-w-[19rem]">
            <KeySignatureDisplay keySpec={question.key.id} clef={question.clef} flash={flash} />
          </div>
        ) : (
          <div className="text-center">
            <p className={[
              'text-6xl font-black tracking-tight',
              flash === 'correct' ? 'text-green-500' : flash === 'wrong' ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-100',
            ].join(' ')}>
              {displayKeyName(question.key, config.nameSystem)}
            </p>
            <p className="text-sm font-semibold text-zinc-400 mt-2">maggiore</p>
          </div>
        )}
        {/* Corner badge, not a centred overlay: the question itself already tints
            green/red, and a full-size mark would sit on top of the accidentals. */}
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
        {isSignatureQuestion
          ? `Che tonalità è? ${question.clef === 'treble' ? '(Violino)' : '(Basso)'}`
          : 'Quante alterazioni ha?'}
      </p>

      {isSignatureQuestion ? (
        <KeyButtons
          rows={keyGrid}
          onSelect={handleAnswer}
          disabled={flash === 'correct'}
          wrongKeyId={wrongAnswerId}
          nameSystem={config.nameSystem}
        />
      ) : (
        <AccidentalCountButtons
          types={countTypes}
          onSelect={handleAnswer}
          disabled={flash === 'correct'}
          wrongAnswerId={wrongAnswerId}
        />
      )}
    </>
  );
}
