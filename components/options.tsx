'use client';

import { ReactNode } from 'react';

/** The building blocks every settings form here is made of, so they all look and read the same. */

export function OptionSection({
  title,
  action,
  children,
}: {
  title: string;
  /** Small link-styled control at the right of the title, e.g. "Tutte" */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
      {children}
    </button>
  );
}

function selectedClasses(selected: boolean, muted = false): string {
  return selected
    ? 'bg-indigo-600 text-white border-indigo-600'
    : muted
      ? 'border-zinc-200 dark:border-zinc-700 text-zinc-400'
      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800';
}

/** A compact on/off or one-of-many button */
export function Choice({
  selected,
  onClick,
  children,
  className = '',
  muted,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Unselected cells in a dense grid read lighter, so the selection stands out */
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={['rounded-xl text-sm font-semibold border-2 transition-colors', selectedClasses(selected, muted), className].join(' ')}
    >
      {children}
    </button>
  );
}

/** A full-width choice, for options named in a few words rather than one */
export function ChoiceCard({ selected, onClick, title }: { selected: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={['w-full px-4 py-2 rounded-xl text-left text-sm font-semibold border-2 transition-colors', selectedClasses(selected)].join(' ')}
    >
      {title}
    </button>
  );
}
