'use client';

import { Mic, MicOff } from 'lucide-react';
import { displaySpelledNote } from '@/lib/notes';
import { AudioInput } from '@/lib/audioInput';
import { isTransposing, writtenPitch } from '@/lib/instruments';
import { DetectedNote } from '@/lib/pitch';
import { Clef, InstrumentId, NoteNameSystem } from '@/lib/types';

export interface PlayedAnswer {
  note: DetectedNote;
  correct: boolean;
}

interface InstrumentInputProps extends Pick<AudioInput, 'status' | 'error' | 'level' | 'heard'> {
  nameSystem: NoteNameSystem;
  instrument: InstrumentId;
  /** Clef being read, which is what the heard pitch is named back in */
  clef: Clef;
  /** The last note taken as an answer; stays put until the next question */
  answer?: PlayedAnswer | null;
}

/** Within this much of the tempered pitch the note reads as in tune. */
const IN_TUNE_CENTS = 15;

export default function InstrumentInput({
  status,
  error,
  level,
  heard,
  nameSystem,
  instrument,
  clef,
  answer,
}: InstrumentInputProps) {
  if (status === 'off') return null;

  if (status === 'denied' || status === 'unsupported' || status === 'error') {
    return (
      <div className="w-full flex items-center gap-2 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <MicOff size={14} className="shrink-0" />
        <span>{error ?? 'Ingresso audio non disponibile'} — rispondi con i pulsanti.</span>
      </div>
    );
  }

  const inTune = heard !== null && Math.abs(heard.cents) <= IN_TUNE_CENTS;
  const wrong = answer !== null && answer !== undefined && !answer.correct;
  // A transposing instrument reads a different note from the one it sounds, and
  // the staff is what the player is looking at: name the pitch back in written
  // terms, and keep the sounding one as the small print.
  const transposes = isTransposing(instrument, clef);
  const written = heard && writtenPitch(heard.midi, instrument, clef);
  const answerWritten = answer && writtenPitch(answer.note.midi, instrument, clef);

  return (
    <div
      className={[
        'w-full rounded-2xl border px-3 py-2 transition-colors',
        wrong
          ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Mic size={12} className={['shrink-0', status === 'listening' ? 'text-indigo-500' : 'text-zinc-400'].join(' ')} />
        <span className={['text-[11px] uppercase tracking-wide', wrong ? 'text-red-400 dark:text-red-500' : 'text-zinc-400'].join(' ')}>
          {status === 'starting' ? 'Attivazione…' : 'Sento'}
        </span>

        <span className={[
          'text-xl font-black leading-none',
          heard ? (wrong ? 'text-red-700 dark:text-red-300' : 'text-zinc-800 dark:text-zinc-100') : 'text-zinc-300 dark:text-zinc-700',
        ].join(' ')}>
          {written ? displaySpelledNote(written.letter, written.accidental, nameSystem) : '—'}
        </span>

        {written && heard && (
          <span className={['text-[11px] tabular-nums', wrong ? 'text-red-400 dark:text-red-500' : 'text-zinc-400'].join(' ')}>
            {written.octave}
            {transposes && ` · suona ${displaySpelledNote(heard.letter, heard.accidental, nameSystem)}${heard.octave}`}
          </span>
        )}

        {answer ? (
          // What was actually taken as the answer, which the live readout above
          // has usually already moved on from.
          <span
            className={[
              'ml-auto flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold',
              answer.correct
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                : 'bg-red-500 text-white',
            ].join(' ')}
          >
            {answer.correct ? '✓' : '✗'}
            {answerWritten && displaySpelledNote(answerWritten.letter, answerWritten.accidental, nameSystem)}
          </span>
        ) : (
          heard && (
            <span className={[
              'ml-auto text-[11px] tabular-nums',
              inTune ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
            ].join(' ')}>
              {heard.cents > 0 ? '+' : ''}{heard.cents}¢ · {Math.round(heard.frequency)} Hz
            </span>
          )
        )}
      </div>

      <div className={['mt-2 h-1.5 rounded-full overflow-hidden', wrong ? 'bg-red-100 dark:bg-red-900/50' : 'bg-zinc-100 dark:bg-zinc-800'].join(' ')}>
        <div
          className={['h-full rounded-full transition-[width] duration-75', wrong ? 'bg-red-400' : 'bg-indigo-500'].join(' ')}
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </div>
  );
}
