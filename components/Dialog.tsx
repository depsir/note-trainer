'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body, for the dialog's actions */
  footer?: ReactNode;
  size?: 'sm' | 'md';
}

/**
 * A modal on the native `<dialog>`: the browser already gives it Esc to close, a focus
 * trap and an inert page behind, which a hand-rolled overlay would have to rebuild.
 * It is shown for as long as it is mounted.
 */
export default function Dialog({ title, subtitle, onClose, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc fires `cancel`; letting the parent unmount the dialog keeps one source of truth.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself, never on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={[
        'm-auto mb-0 sm:mb-auto w-full p-0 bg-transparent backdrop:bg-black/50 text-zinc-900 dark:text-zinc-100',
        size === 'sm' ? 'max-w-sm' : 'max-w-md',
      ].join(' ')}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-6">{children}</div>
        {footer && <div className="p-5 border-t border-zinc-200 dark:border-zinc-700">{footer}</div>}
      </div>
    </dialog>
  );
}
