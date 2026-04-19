'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart2, Settings } from 'lucide-react';
import NoteButtons from '@/components/NoteButtons';
import ConfigPanel from '@/components/ConfigPanel';
import { useNoteStats } from '@/lib/storage';
import { ALL_NOTES, noteId, displayNoteName } from '@/lib/notes';
import { pickNote, updateWeight, initStats } from '@/lib/adaptive';
import { Note } from '@/lib/types';

const StaffDisplay = dynamic(() => import('@/components/StaffDisplay'), { ssr: false });

type Phase = 'idle' | 'playing' | 'finished';
type FlashType = 'correct' | 'wrong' | null;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HomePage() {
  const { stats, config, hydrated, updateStats, updateConfig } = useNoteStats();
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [flash, setFlash] = useState<FlashType>(null);
  const [lastAnswer, setLastAnswer] = useState<{ letter: string; correct: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const lastNoteIdRef = useRef<string | undefined>(undefined);
  const statsRef = useRef(stats);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { statsRef.current = stats; }, [stats]);

  const getCandidates = useCallback(() => {
    return ALL_NOTES.filter((n) => config.enabledNotes.includes(noteId(n)));
  }, [config.enabledNotes]);

  const nextNote = useCallback((currentStats = statsRef.current) => {
    const candidates = getCandidates();
    if (candidates.length === 0) return;
    const note = pickNote(candidates, currentStats, config.useAdaptive, lastNoteIdRef.current);
    lastNoteIdRef.current = noteId(note);
    setCurrentNote(note);
    setFlash(null);
    setLastAnswer(null);
  }, [getCandidates, config.useAdaptive]);

  const startSession = useCallback(() => {
    const ids = getCandidates().map((n) => noteId(n));
    const newStats = initStats(ids, statsRef.current);
    updateStats(newStats);
    setSessionCorrect(0);
    setSessionTotal(0);
    setPhase('playing');
    setTimeLeft(config.durationSeconds);
    nextNote(newStats);
  }, [config.durationSeconds, getCandidates, nextNote, updateStats]);

  useEffect(() => {
    if (phase !== 'playing' || config.durationSeconds === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase('finished');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, config.durationSeconds]);

  const handleAnswer = useCallback((letter: string) => {
    if (!currentNote || phase !== 'playing') return;
    const correct = letter === currentNote.letter;
    const id = noteId(currentNote);
    setLastAnswer({ letter, correct });
    setSessionTotal((t) => t + 1);
    const newStats = updateWeight(statsRef.current, id, correct);
    updateStats(newStats);
    if (correct) {
      setSessionCorrect((c) => c + 1);
      setFlash('correct');
      setTimeout(() => nextNote(newStats), 600);
    } else {
      setFlash('wrong');
    }
  }, [currentNote, phase, nextNote, updateStats]);

  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-black tracking-tight text-indigo-600">🎵 Note Coach</h1>
        <div className="flex gap-2">
          <Link href="/stats" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <BarChart2 size={20} />
          </Link>
          <button onClick={() => setShowConfig(true)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 max-w-lg mx-auto w-full">
        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="text-center space-y-1">
              <p className="text-zinc-500 text-sm">
                {config.clefs.map(c => c === 'treble' ? 'Chiave di Violino' : 'Chiave di Basso').join(' · ')}
              </p>
              <p className="text-zinc-400 text-sm">
                {config.durationSeconds === 0 ? 'Tempo illimitato' : formatTime(config.durationSeconds)}
                {' · '}{config.useAdaptive ? 'Adattivo' : 'Casuale'}
                {' · '}{config.nameSystem === 'italian' ? 'Do Re Mi' : 'C D E'}
              </p>
            </div>
            <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
              <StaffDisplay vexKey="c/4" clef="treble" />
            </div>
            <button
              onClick={startSession}
              className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              Inizia
            </button>
          </div>
        )}

        {phase === 'playing' && currentNote && (
          <>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-zinc-500">
                {sessionCorrect}/{sessionTotal} corrette
              </span>
              {config.durationSeconds > 0 ? (
                <span className={['text-sm font-mono font-bold', timeLeft <= 10 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'].join(' ')}>
                  {formatTime(timeLeft)}
                </span>
              ) : (
                <button onClick={() => setPhase('finished')} className="text-sm text-zinc-400 hover:text-zinc-600 font-semibold">
                  Fine
                </button>
              )}
            </div>

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

            <NoteButtons
              onSelect={handleAnswer}
              disabled={flash === 'correct'}
              lastAnswer={lastAnswer}
              nameSystem={config.nameSystem}
            />
          </>
        )}

        {phase === 'finished' && (
          <div className="flex flex-col items-center gap-6 w-full text-center">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">Sessione completata!</h2>
              <p className="text-zinc-500 mt-1">{sessionCorrect} corrette su {sessionTotal} tentativi</p>
              {sessionTotal > 0 && (
                <p className="text-4xl font-black text-indigo-600 mt-3">
                  {Math.round((sessionCorrect / sessionTotal) * 100)}%
                </p>
              )}
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={startSession} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors">
                Ancora
              </button>
              <Link href="/stats" className="flex-1 py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl text-center hover:bg-zinc-50">
                Statistiche
              </Link>
            </div>
          </div>
        )}
      </main>

      {showConfig && (
        <ConfigPanel config={config} onSave={updateConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
