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
import { BEATS_PER_MEASURE, buildSheet, Sheet } from '@/lib/sheet';
import {
  CORRECT_FEEDBACK_DELAY_MS,
  FlashType,
  NoteTrainerProps,
  SEQUENCE_FEEDBACK_DELAY_MS,
  SessionPhase,
  useSessionClock,
  useStartOnMount,
} from '@/lib/session';
import { useWakeLock } from '@/lib/wakeLock';

/** Vertical padding and border of the card around the score, in CSS pixels */
const CARD_CHROME = 26;

/**
 * Note reading as a written piece: a few bars are drawn up front and read left to right,
 * the score moving itself along. A note that is missed stays put until it is right. With
 * no clock the piece is the session; against one, a fresh page follows each finished one
 * until the time runs out or ■ Fine is pressed.
 */
export default function SheetTrainer({ drill, config, onExit }: NoteTrainerProps) {
  const { stats, updateStats } = useNoteStats();
  const [phase, setPhase] = useState<SessionPhase>('playing');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  /** Tries each finished note took; its length is also how far into the piece we are */
  const [answered, setAnswered] = useState<number[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [flash, setFlash] = useState<FlashType>(null);
  const [lastAnswer, setLastAnswer] = useState<{ letter: string; correct: boolean } | null>(null);
  const [lastHeard, setLastHeard] = useState<PlayedAnswer | null>(null);
  /** Tries per note of the pieces already finished in this session */
  const [earlier, setEarlier] = useState<number[]>([]);

  const noteShownAtRef = useRef(0);
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const [areaHeight, setAreaHeight] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);
  const statsRef = useRef(stats);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  useEffect(() => {
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => setAreaHeight(entry.contentRect.height));
    observer.observe(area);
    return () => observer.disconnect();
  }, [area]);

  const listening = drill.listening;
  const measures = drill.notesAtOnce / BEATS_PER_MEASURE;
  const timed = drill.durationSeconds > 0;

  const instrument = getInstrument(config.audio.instrument);

  const candidates = useMemo(
    () => ALL_NOTES.filter((n) => drill.clefs.includes(n.clef) && drill.enabledNotes.includes(noteId(n))),
    [drill.clefs, drill.enabledNotes]
  );

  const clefRange = useMemo(
    () => candidates.filter((n) => n.clef === sheet?.clef),
    [candidates, sheet?.clef]
  );

  const currentIndex = answered.length;
  const currentNote = sheet?.notes[currentIndex] ?? null;
  const fumbled = useMemo(() => answered.map((tries) => tries > 1), [answered]);
  const read = earlier.length + answered.length;
  const perfect = useMemo(
    () => [...earlier, ...answered].filter((tries) => tries === 1).length,
    [earlier, answered]
  );

  const finish = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setPhase('finished');
  }, []);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(drill.durationSeconds, finish);

  /** Writes out a fresh piece and puts the reading back at its first note */
  const newPiece = useCallback((currentStats = statsRef.current) => {
    // Adaptive picking is on hold while it is reworked: every enabled note is as likely as the next.
    setSheet(buildSheet(candidates, currentStats, false, measures));
    setAnswered([]);
    setWrongAttempts(0);
    setFlash(null);
    setLastAnswer(null);
    setLastHeard(null);
    noteShownAtRef.current = Date.now();
  }, [candidates, measures]);

  const startSession = useCallback(() => {
    if (candidates.length === 0) return;
    const newStats = initStats(candidates.map((n) => noteId(n)), statsRef.current);
    updateStats(newStats);
    newPiece(newStats);
    setEarlier([]);
    setTotalAttempts(0);
    setPhase('playing');
    startClock();
  }, [candidates, newPiece, startClock, updateStats]);

  useStartOnMount(startSession);

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
    const tries = [...answered, wrongAttempts + 1];
    setAnswered(tries);
    setWrongAttempts(0);
    setFlash('correct');
    // The next note is already lit and scrolling into place; the flash only holds the
    // input shut long enough for a ringing string not to answer it.
    noteShownAtRef.current = Date.now();
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => {
        if (isLast) {
          // Against the clock a page read is followed by the next; with none, the piece was the session.
          if (timed) {
            setEarlier((previous) => [...previous, ...tries]);
            newPiece();
          } else {
            setPhase('finished');
          }
          return;
        }
        setFlash(null);
        setLastAnswer(null);
        setLastHeard(null);
      },
      // The last note gets longer, so the finished page can be seen before the next one.
      isLast ? SEQUENCE_FEEDBACK_DELAY_MS : CORRECT_FEEDBACK_DELAY_MS
    );
  }, [sheet, currentNote, currentIndex, phase, flash, answered, wrongAttempts, newPiece, timed, updateStats]);

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
    enabled: listening && phase === 'playing',
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
    stopClock();
    finish();
  }, [stopClock, finish]);

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={read}
        total={totalAttempts}
        onRestart={startSession}
        onSettings={onExit}
        detail={read === 0 ? undefined : `${perfect} su ${read} al primo colpo`}
        score={timed ? `${read} note` : undefined}
      />
    );
  }

  if (!sheet) return null;

  // Playing is the answer; the buttons only stand in when the microphone cannot.
  const showButtons = !listening || ['denied', 'unsupported', 'error'].includes(audio.status);

  const done = Math.min(currentIndex, sheet.notes.length);

  return (
    <>
      <SessionHud
        correct={answered.length}
        total={totalAttempts}
        timeLeft={timeLeft}
        showTimer={timed}
        onStop={stop}
        scoreLabel={`${read} note lette`}
      />

      {/* On a wide screen this takes whatever height the window has left, and the score fits itself to it */}
      <div ref={setArea} className="w-full lg:flex-1 lg:min-h-0 flex flex-col justify-center">
      <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl py-3 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <SheetStaffDisplay
          maxHeight={areaHeight > 0 ? areaHeight - CARD_CHROME : undefined}
          notes={sheet.notes}
          clef={sheet.clef}
          range={clefRange}
          currentIndex={currentIndex}
          fumbled={fumbled}
          wrongAttempts={wrongAttempts}
        />
      </div>
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
        strictOctave={config.audio.strictOctave}
      />

      {showButtons && (
        <NoteButtons
          onSelect={handleAnswer}
          disabled={flash === 'correct'}
          lastAnswer={lastAnswer}
          nameSystem={config.nameSystem}
        />
      )}
    </>
  );
}
