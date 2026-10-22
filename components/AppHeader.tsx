'use client';

import { MouseEvent, createContext, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import Dialog from '@/components/Dialog';
import NameSystemOption from '@/components/NameSystemOption';
import { useNoteStats } from '@/lib/storage';

/** A running session hands over how to stop it, and takes it back when it is over. */
export const SessionContext = createContext<((stop: (() => void) | null) => void) | null>(null);

interface AppHeaderProps {
  /** The page's own title. On a phone it takes the name's place, after an arrow home. */
  title?: string;
  /**
   * Takes the place of the way home while a session runs: it stops the session, as its own
   * stop button does, so that the summary is not skipped.
   */
  onLeave?: () => void;
  /** Off on a phone, where a running session keeps the whole screen */
  hideOnPhone?: boolean;
}

/**
 * The bar on top of every page: the name leads home, the icon to the general settings.
 * The stats page is still there at /stats, but not linked while adaptive picking is reworked.
 */
export default function AppHeader({ title, onLeave, hideOnPhone = false }: AppHeaderProps) {
  const { config, updateConfig } = useNoteStats();
  const [showSettings, setShowSettings] = useState(false);

  const leave = (e: MouseEvent) => {
    if (!onLeave) return;
    e.preventDefault();
    onLeave();
  };

  const home = (
    <Link href="/" onClick={leave} className="text-lg font-black tracking-tight text-indigo-600 rounded-lg -mx-1 px-1 hover:opacity-80 whitespace-nowrap">
      🎵 Note Coach
    </Link>
  );

  return (
    <header
      className={[
        hideOnPhone ? 'hidden sm:flex' : 'flex',
        'items-center gap-2 px-4 h-14 shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {title ? (
          <>
            <Link
              href="/"
              onClick={leave}
              aria-label="Tutti gli esercizi"
              title="Tutti gli esercizi"
              className="sm:hidden p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              <ArrowLeft size={20} />
            </Link>
            <span className="hidden sm:contents">
              {home}
              <span aria-hidden className="text-zinc-300 dark:text-zinc-600 text-xl">›</span>
            </span>
            <h1 className="truncate text-lg font-bold text-zinc-800 dark:text-zinc-100">{title}</h1>
          </>
        ) : (
          home
        )}
      </div>

      <button
        onClick={() => setShowSettings(true)}
        aria-label="Impostazioni generali"
        title="Impostazioni generali"
        className="p-2 -mr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
      >
        <Settings size={20} />
      </button>

      {showSettings && (
        <Dialog
          title="Impostazioni generali"
          subtitle="Valgono per tutti gli esercizi. Le opzioni di ciascun esercizio sono nella sua pagina."
          onClose={() => setShowSettings(false)}
        >
          <NameSystemOption
            value={config.nameSystem}
            onChange={(nameSystem) => updateConfig({ ...config, nameSystem })}
          />
        </Dialog>
      )}
    </header>
  );
}
