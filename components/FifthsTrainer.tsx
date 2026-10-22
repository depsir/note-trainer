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
} from '@/lib/fifths';
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, SessionPhase, TrainerProps, useSessionClock, useStartOnMount } from '@/lib/session';

export default function FifthsTrainer({ config, onExit }: TrainerProps) {
  const [phase, setPhase] = useState<SessionPhase>('playing');
  const [question, setQuestion] = useState<FifthsQuestion | null>(null);
  const [flash, setFlash] = useState<FlashType>(null);
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  const expire = useCallback(() => setPhase('finished'), []);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(config.fifths.durationSeconds, expire);
  const finish = useCallback(() => {
    stopClock();
    setPhase('finished');
  }, [stopClock]);

  const keys = useMemo(
    () => MAJOR_KEYS.filter((key) => config.fifths.enabledKeys.includes(key.id)),
    [config.fifths.enabledKeys]
  );
  const keyGrid = useMemo(() => keyGridForPool(keys), [keys]);
  const countTypes = useMemo(() => availableAccidentalTypes(keys), [keys]);

  const nextQuestion = useCallback((previousId?: string) => {
    if (keys.length === 0 || config.fifths.questionKinds.length === 0) return;
    setQuestion(pickQuestion(keys, config.fifths.questionKinds, config.fifths.clefs, previousId));
    setFlash(null);
    setWrongAnswerId(null);
  }, [keys, config.fifths.questionKinds, config.fifths.clefs]);

  const startSession = useCallback(() => {
    setSessionCorrect(0);
    setSessionTotal(0);
    setPhase('playing');
    startClock();
    nextQuestion(undefined);
  }, [nextQuestion, startClock]);

  useStartOnMount(startSession);

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

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={sessionTotal}
        onRestart={startSession}
        onSettings={onExit}
      />
    );
  }

  if (!question) return null;

  const isSignatureQuestion = question.kind === 'signature-to-key';

  return (
    <>
      <SessionHud
        correct={sessionCorrect}
        total={sessionTotal}
        timeLeft={timeLeft}
        showTimer={config.fifths.durationSeconds > 0}
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
