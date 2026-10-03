'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstrumentInput, { PlayedAnswer } from '@/components/InstrumentInput';
import NoteButtons from '@/components/NoteButtons';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import SheetStaffDisplay from '@/components/SheetStaffDisplay';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, noteId } from '@/lib/notes';
import { getInstrument, heardMatches, writtenPitch } from '@/lib/instruments';
import { HeardNote, useAudioInput } from '@/lib/audioInput';
import { initStats, updateWeight } from '@/lib/adaptive';
import { buildSheet, measureOf, Sheet, sheetNoteCount } from '@/lib/sheet';
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, SEQUENCE_FEEDBACK_DELAY_MS, SessionPhase } from '@/lib/session';
import { useWakeLock } from '@/lib/wakeLock';
import { ExerciseConfig } from '@/lib/types';

interface SheetTrainerProps {
  config: ExerciseConfig;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
}

/**
 * Note reading as a written piece: a few bars are drawn up front and read left to right,
 * the score scrolling itself along. Nothing is on the clock — the piece ends when its last
 * note is read — and a note that is missed stays put until it is right, by button or by
 * playing it.
 */
export default function SheetTrainer({ config, phase, onPhaseChange }: SheetTrainerProps) {
  const { stats, updateStats } = useNoteStats();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  /** Tries each finished note took; its length is also how far into the piece we are */
  const [answered, setAnswered] = useState<number[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [flash, setFlash] = useState<FlashType>(null);
  const [lastAnswer, setLastAnswer] = useState<{ letter: string; correct: boolean } | null>(null);
  const [lastHeard, setLastHeard] = useState<PlayedAnswer | null>(null);

  const noteShownAtRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const statsRef = useRef(stats);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const instrument = getInstrument(config.audio.instrument);

  const candidates = useMemo(
    () => ALL_NOTES.filter((n) => config.enabledNotes.includes(noteId(n))),
    [config.enabledNotes]
  );

  const noteCount = sheetNoteCount(config.sheet.measures);
  const currentIndex = answered.length;
  const currentNote = sheet?.notes[currentIndex] ?? null;
  const fumbled = useMemo(() => answered.map((tries) => tries > 1), [answered]);
  const perfect = useMemo(() => answered.filter((tries) => tries === 1).length, [answered]);

  const startSession = useCallback(() => {
    if (candidates.length === 0) return;
    const newStats = initStats(candidates.map((n) => noteId(n)), statsRef.current);
    updateStats(newStats);
    setSheet(buildSheet(candidates, newStats, config.useAdaptive, config.sheet.measures));
    setAnswered([]);
    setWrongAttempts(0);
    setTotalAttempts(0);
    setFlash(null);
    setLastAnswer(null);
    setLastHeard(null);
    noteShownAtRef.current = Date.now();
    onPhaseChange('playing');
  }, [candidates, config.useAdaptive, config.sheet.measures, onPhaseChange, updateStats]);

  const registerAnswer = useCallback((correct: boolean, buttonLetter: string | null) => {
    if (!sheet || !currentNote || phase !== 'playing' || flash === 'correct') return;

    const responseTimeMs = Date.now() - noteShownAtRef.current;
    if (buttonLetter !== null) setLastAnswer({ letter: buttonLetter, correct });
    setTotalAttempts((count) => count + 1);
    updateStats(updateWeight(statsRef.current, noteId(currentNote), correct, responseTimeMs));

    if (!correct) {
      setWrongAttempts((count) => count + 1);
      return;
    }

    const isLast = currentIndex === sheet.notes.length - 1;
    setAnswered((previous) => [...previous, wrongAttempts + 1]);
    setWrongAttempts(0);
    setFlash('correct');
    // The next note is already lit and scrolling into place; the flash only holds the
    // input shut long enough for a ringing string not to answer it.
    noteShownAtRef.current = Date.now();
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => {
        if (isLast) {
          onPhaseChange('finished');
          return;
        }
        setFlash(null);
        setLastAnswer(null);
        setLastHeard(null);
      },
      // The last note gets longer, so the finished piece can be seen before the summary.
      isLast ? SEQUENCE_FEEDBACK_DELAY_MS : CORRECT_FEEDBACK_DELAY_MS
    );
  }, [sheet, currentNote, currentIndex, phase, flash, wrongAttempts, onPhaseChange, updateStats]);

  const handleAnswer = useCallback(
    (letter: string) => registerAnswer(letter === currentNote?.letter, letter),
    [currentNote, registerAnswer]
  );

  const handleHeard = useCallback(
    (note: HeardNote) => {
      if (!currentNote) return;
      const correct = heardMatches(note.midi, currentNote, instrument.id, config.audio.strictOctave);
      // The buttons answer in written terms, so the heard pitch is named back
      // the way the player reads it. An accidental has no button of its own,
      // and lighting up its letter would read as the right note being
      // rejected — the panel says what was heard instead.
      const written = writtenPitch(note.midi, instrument.id, currentNote.clef);
      setLastHeard({ note, correct });
      registerAnswer(correct, written.accidental === '' ? written.letter : null);
    },
    [currentNote, instrument, config.audio.strictOctave, registerAnswer]
  );

  const audio = useAudioInput({
    enabled: config.audio.enabled && phase === 'playing',
    deviceId: config.audio.deviceId,
    a4: config.audio.a4,
    instrument: config.audio.instrument,
    paused: flash === 'correct',
    onNote: handleHeard,
  });

  // Reading a piece by playing it means minutes without touching the screen,
  // which would otherwise go dark mid-exercise.
  useWakeLock(phase === 'playing' && audio.status === 'listening');

  const stop = useCallback(() => {
    window.clearTimeout(timerRef.current);
    onPhaseChange('finished');
  }, [onPhaseChange]);

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={answered.length}
        total={totalAttempts}
        onRestart={startSession}
        onHome={() => onPhaseChange('idle')}
        showStatsLink
        detail={
          answered.length === 0
            ? undefined
            : `${perfect} su ${answered.length} al primo colpo`
        }
      />
    );
  }

  // `!sheet` while playing means the setting was turned on mid-session and this component
  // took over an already-running one: there is nothing written yet, so start over.
  if (phase === 'idle' || !sheet) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm">
            📜 Spartito · {config.sheet.measures} battute · {noteCount} note
          </p>
          <p className="text-zinc-400 text-sm">
            {config.clefs.map((c) => (c === 'treble' ? 'Chiave di Violino' : 'Chiave di Basso')).join(' · ')}
            {' · '}{config.useAdaptive ? 'Adattivo' : 'Casuale'}
            {' · '}{config.nameSystem === 'italian' ? 'Do Re Mi' : 'C D E'}
            {config.audio.enabled ? ` · ${instrument.icon} ${instrument.label}` : ''}
          </p>
          <p className="text-zinc-400 text-xs pt-1">
            Nessun timer: leggi le note una dopo l’altra, lo spartito scorre da solo.
          </p>
        </div>
        <button
          onClick={startSession}
          className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          Inizia
        </button>
      </div>
    );
  }

  const measures = sheet.measures;
  const done = Math.min(currentIndex, sheet.notes.length);

  return (
    <>
      <SessionHud
        correct={answered.length}
        total={totalAttempts}
        timeLeft={0}
        showTimer={false}
        onStop={stop}
        scoreLabel={`${done}/${sheet.notes.length} note`}
        detail={`Battuta ${Math.min(measureOf(done), measures)}/${measures}`}
      />

      <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl py-3 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <SheetStaffDisplay
          notes={sheet.notes}
          clef={sheet.clef}
          currentIndex={currentIndex}
          fumbled={fumbled}
          wrongAttempts={wrongAttempts}
        />
      </div>

      <div className="w-full flex items-center gap-3 -mt-3">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-[width] duration-300"
            style={{ width: `${(done / sheet.notes.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400 shrink-0">
          {sheet.clef === 'treble' ? 'Violino' : 'Basso'}
        </span>
      </div>

      <InstrumentInput
        status={audio.status}
        error={audio.error}
        level={audio.level}
        heard={audio.heard}
        nameSystem={config.nameSystem}
        instrument={config.audio.instrument}
        clef={sheet.clef}
        answer={lastHeard}
      />

      <NoteButtons
        onSelect={handleAnswer}
        disabled={flash === 'correct'}
        lastAnswer={lastAnswer}
        nameSystem={config.nameSystem}
      />
    </>
  );
}
