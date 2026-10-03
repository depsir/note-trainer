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
import { CORRECT_FEEDBACK_DELAY_MS, FlashType, formatTime, SessionPhase, useSessionClock } from '@/lib/session';
import { ExerciseConfig, Note } from '@/lib/types';

interface NotesTrainerProps {
  config: ExerciseConfig;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
}

export default function NotesTrainer({ config, phase, onPhaseChange }: NotesTrainerProps) {
  const { stats, updateStats } = useNoteStats();
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

  const expire = useCallback(() => onPhaseChange('finished'), [onPhaseChange]);
  const { timeLeft, start: startClock, stop: stopClock } = useSessionClock(config.durationSeconds, expire);
  const finish = useCallback(() => {
    stopClock();
    onPhaseChange('finished');
  }, [stopClock, onPhaseChange]);

  const instrument = getInstrument(config.audio.instrument);

  const candidates = useMemo(
    () => ALL_NOTES.filter((n) => config.enabledNotes.includes(noteId(n))),
    [config.enabledNotes]
  );

  const nextNote = useCallback((currentStats = statsRef.current) => {
    if (candidates.length === 0) return;
    const note = pickNote(candidates, currentStats, config.useAdaptive, lastNoteIdRef.current);
    lastNoteIdRef.current = noteId(note);
    setCurrentNote(note);
    noteShownAtRef.current = Date.now();
    setFlash(null);
    setLastAnswer(null);
    setLastHeard(null);
  }, [candidates, config.useAdaptive]);

  const startSession = useCallback(() => {
    const newStats = initStats(candidates.map((n) => noteId(n)), statsRef.current);
    updateStats(newStats);
    setSessionCorrect(0);
    setSessionTotal(0);
    onPhaseChange('playing');
    startClock();
    nextNote(newStats);
  }, [candidates, nextNote, onPhaseChange, startClock, updateStats]);

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
    enabled: config.audio.enabled && phase === 'playing',
    deviceId: config.audio.deviceId,
    a4: config.audio.a4,
    instrument: config.audio.instrument,
    // A string still ringing from the last answer must not answer the next one.
    paused: flash === 'correct',
    onNote: handleHeard,
  });

  if (phase === 'finished') {
    return (
      <SessionSummary
        correct={sessionCorrect}
        total={sessionTotal}
        onRestart={startSession}
        onHome={() => onPhaseChange('idle')}
        showStatsLink
      />
    );
  }

  // Turning the sheet setting off mid-session swaps this component in while already
  // playing, with nothing on the staff yet: that lands back on the start screen.
  if (phase === 'idle' || !currentNote) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm">
            {config.clefs.map((c) => (c === 'treble' ? 'Chiave di Violino' : 'Chiave di Basso')).join(' · ')}
          </p>
          <p className="text-zinc-400 text-sm">
            {config.durationSeconds === 0 ? 'Tempo illimitato' : formatTime(config.durationSeconds)}
            {' · '}{config.useAdaptive ? 'Adattivo' : 'Casuale'}
            {' · '}{config.nameSystem === 'italian' ? 'Do Re Mi' : 'C D E'}
            {config.audio.enabled ? ` · ${instrument.icon} ${instrument.label}` : ''}
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

  return (
    <>
      <SessionHud
        correct={sessionCorrect}
        total={sessionTotal}
        timeLeft={timeLeft}
        showTimer={config.durationSeconds > 0}
        onStop={finish}
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
