'use client';

import { TrainingMode } from '@/lib/types';

interface ModeSelectorProps {
  mode: TrainingMode;
  onChange: (mode: TrainingMode) => void;
}

const MODES: { id: TrainingMode; glyph: string; title: string; subtitle: string }[] = [
  { id: 'notes', glyph: '𝄞', title: 'Lettura note', subtitle: 'Riconosci le note sul pentagramma' },
  { id: 'fifths', glyph: '♯♭', title: 'Tonalità', subtitle: 'Armature e alterazioni' },
  { id: 'relatives', glyph: 'M/m', title: 'Relative', subtitle: 'Maggiore e minore in coppia' },
  { id: 'intervals', glyph: 'M3', title: 'Intervalli', subtitle: 'La distanza fra due note' },
  { id: 'scales', glyph: '♪↗', title: 'Scale', subtitle: 'Le note in ordine, magg. e min.' },
];

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {MODES.map((option, index) => {
        const selected = option.id === mode;
        // An odd number of modes would leave a half-width gap: the last one takes the whole row
        const fullWidth = MODES.length % 2 === 1 && index === MODES.length - 1;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            className={[
              'flex flex-col items-center gap-1 px-3 py-4 rounded-2xl border-2 text-center transition-colors',
              fullWidth ? 'col-span-2' : '',
              selected
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            <span
              className={[
                'text-3xl leading-none font-serif',
                selected ? 'text-indigo-600' : 'text-zinc-400 dark:text-zinc-500',
              ].join(' ')}
              aria-hidden
            >
              {option.glyph}
            </span>
            <span className={['text-sm font-bold', selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'].join(' ')}>
              {option.title}
            </span>
            <span className="text-[11px] leading-tight text-zinc-400">{option.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
