'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstrumentInput, { PlayedAnswer } from '@/components/InstrumentInput';
import NoteButtons from '@/components/NoteButtons';
import SessionHud from '@/components/SessionHud';
import SessionSummary from '@/components/SessionSummary';
import StaffDisplay from '@/components/StaffDisplay';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, noteId } from '@/lib/notes';
import { getInstrument, heardMatches, writtenPitch } from '@/lib/instruments';
import { HeardNote, useAudioInput } from '@/lib/audioInput';
import { pickNote, updateWeight, initStats } from '@/lib/adaptive';
import {
  CORRECT_FEEDBACK_DELAY_MS,
  FlashType,
  NoteTrainerProps,
  SessionPhase,
  useSessionClock,
  useStartOnMount,
} from '@/lib/session';
import { useWakeLock } from '@/lib/wakeLock';
import { Note } from '@/lib/types';

/** One note at a time on the staff, named or played until the clock runs out. */
export default function NotesTrainer({ drill, config, onExit }: NoteTrainerProps) {
  const { stats, updateStats } = useNoteStats();
  const [phase, setPhase] = useState<SessionPhase>('playing');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [flash, setFlash] = useState<FlashType>(null);
  const [lastAnswer, setLastAnswer] = useState<{ letter: string; correct: boolean } | null>(null);
  const [lastHeard, setLastHeard] = useState<PlayedAnswer | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const lastNoteIdRef = useRef<string | undefined>(undefined);
  const noteShownAtRef = useRef<number>(0);
  const statsRef = useRef(stats);

  useEffect(() => { statsRef.current = stats; }, [stats]);

  const listening = drill.listening;

  const expire = useCallback(() => setPhase('finished'), []);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(drill.durationSeconds, expire);
  const finish = useCallback(() => {
    stopClock();
    setPhase('finished');
  }, [stopClock]);

  const instrument = getInstrument(config.audio.instrument);

  const candidates = useMemo(
    () => ALL_NOTES.filter((n) => drill.clefs.includes(n.clef) && drill.enabledNotes.includes(noteId(n))),
    [drill.clefs, drill.enabledNotes]
  );

  const nextNote = useCallback((currentStats = statsRef.current) => {
    if (candidates.length === 0) return;
    // Adaptive picking is on hold while it is reworked: every enabled note is as likely as the next.
    const note = pickNote(candidates, currentStats, false, lastNoteIdRef.current);
    lastNoteIdRef.current = noteId(note);
    setCurrentNote(note);
    noteShownAtRef.current = Date.now();
    setFlash(null);
    setLastAnswer(null);
    setLastHeard(null);
  }, [candidates]);

  const startSession = useCallback(() => {
    const newStats = initStats(candidates.map((n) => noteId(n)), statsRef.current);
    updateStats(newStats);
    setSessionCorrect(0);
    setSessionTotal(0);
    setPhase('playing');
    startClock();
    nextNote(newStats);
  }, [candidates, nextNote, startClock, updateStats]);

  useStartOnMount(startSession);

  const registerAnswer = useCallback((correct: boolean, buttonLetter: string | null) => {
    if (!currentNote || phase !== 'playing') return;
    const responseTimeMs = Date.now() - noteShownAtRef.current;
    if (buttonLetter !== null) setLastAnswer({ letter: buttonLetter, correct });
    setSessionTotal((t) => t + 1);
    const newStats = updateWeight(statsRef.current, noteId(currentNote), correct, responseTimeMs);
    updateStats(newStats);
    if (correct) {
      setSessionCorrect((c) => c + 1);
      setFlash('correct');
      setTimeout(() => nextNote(newStats), CORRECT_FEEDBACK_DELAY_MS);
    } else {
      setFlash('wrong');
    }
  }, [currentNote, phase, nextNote, updateStats]);

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
    // A string still ringing from the last answer must not answer the next one.
    paused: flash === 'correct',
    onNote: handleHeard,
  });

  // Answering by playing leaves the screen untouched for the whole session,
  // which would otherwise let it go dark mid-exercise.
  useWakeLock(phase === 'playing' && audio.status === 'listening');

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={sessionTotal}
        onRestart={startSession}
        onSettings={onExit}
        score={`${sessionCorrect} note`}
      />
    );
  }

  if (!currentNote) return null;

  // Playing is the answer; the buttons only stand in when the microphone cannot.
  const showButtons = !listening || ['denied', 'unsupported', 'error'].includes(audio.status);

  return (
    <>
      <SessionHud
        correct={sessionCorrect}
        total={sessionTotal}
        timeLeft={timeLeft}
        showTimer={drill.durationSeconds > 0}
        onStop={finish}
        scoreLabel={`${sessionCorrect} note lette`}
      />

      <div className="relative w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <StaffDisplay vexKey={currentNote.vexKey} clef={currentNote.clef} flash={flash} />
        {flash && (
          <div className={[
            'absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none text-6xl font-black',
            flash === 'correct' ? 'text-green-500' : 'text-red-500',
          ].join(' ')}>
            {flash === 'correct' ? '✓' : '✗'}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 -mt-2">
        {currentNote.clef === 'treble' ? 'Chiave di Violino' : 'Chiave di Basso'}
      </p>

      <InstrumentInput
        status={audio.status}
        error={audio.error}
        level={audio.level}
        heard={audio.heard}
        nameSystem={config.nameSystem}
        instrument={config.audio.instrument}
        clef={currentNote.clef}
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
