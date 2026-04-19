'use client';

import { useState } from 'react';
import { ExerciseConfig } from '@/lib/types';
import { ALL_NOTES, displayNoteName, noteId } from '@/lib/notes';
import { X } from 'lucide-react';

interface ConfigPanelProps {
  config: ExerciseConfig;
  onSave: (c: ExerciseConfig) => void;
  onClose: () => void;
  isPlaying?: boolean;
}

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '∞', value: 0 },
];

export default function ConfigPanel({ config, onSave, onClose, isPlaying }: ConfigPanelProps) {
  const [draft, setDraft] = useState<ExerciseConfig>({ ...config });

  const toggleClef = (clef: 'treble' | 'bass') => {
    const next = draft.clefs.includes(clef)
      ? draft.clefs.filter((c) => c !== clef)
      : [...draft.clefs, clef];
    if (next.length === 0) return; // at least one clef required
    // Auto-update enabledNotes to include new clef's notes
    const existingIds = new Set(draft.enabledNotes);
    const clefNotes = ALL_NOTES.filter((n) => n.clef === clef).map((n) => noteId(n));
    let newEnabled: string[];
    if (draft.clefs.includes(clef)) {
      // removing clef — remove its notes
      newEnabled = draft.enabledNotes.filter((id) => !clefNotes.includes(id));
    } else {
      // adding clef — add its notes
      newEnabled = [...existingIds, ...clefNotes];
    }
    setDraft({ ...draft, clefs: next, enabledNotes: newEnabled });
  };

  const toggleNote = (id: string) => {
    const enabled = new Set(draft.enabledNotes);
    if (enabled.has(id)) {
      if (enabled.size <= 2) return; // keep at least 2 notes
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    setDraft({ ...draft, enabledNotes: [...enabled] });
  };

  const toggleAllClef = (clef: 'treble' | 'bass', select: boolean) => {
    const clefNoteIds = ALL_NOTES.filter((n) => n.clef === clef).map((n) => noteId(n));
    const existing = new Set(draft.enabledNotes);
    if (select) {
      clefNoteIds.forEach((id) => existing.add(id));
    } else {
      const remaining = draft.enabledNotes.filter((id) => !clefNoteIds.includes(id));
      if (remaining.length < 2) return;
      clefNoteIds.forEach((id) => existing.delete(id));
    }
    setDraft({ ...draft, enabledNotes: [...existing] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold">Impostazioni</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {isPlaying && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              ⚠️ Sessione in corso — le modifiche saranno applicate alla prossima sessione.
            </div>
          )}
          {/* Duration */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Durata</h3>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDraft({ ...draft, durationSeconds: opt.value })}
                  className={[
                    'px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.durationSeconds === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Clef */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Chiave</h3>
            <div className="flex gap-3">
              {(['treble', 'bass'] as const).map((clef) => (
                <button
                  key={clef}
                  onClick={() => toggleClef(clef)}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.clefs.includes(clef)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {clef === 'treble' ? '🎼 Violino' : '𝄢 Basso'}
                </button>
              ))}
            </div>
          </section>

          {/* Note name system */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Nomi note</h3>
            <div className="flex gap-3">
              {(['italian', 'english'] as const).map((sys) => (
                <button
                  key={sys}
                  onClick={() => setDraft({ ...draft, nameSystem: sys })}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    draft.nameSystem === sys
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {sys === 'italian' ? 'Do Re Mi' : 'C D E'}
                </button>
              ))}
            </div>
          </section>

          {/* Adaptive */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Apprendimento adattivo</h3>
            <button
              onClick={() => setDraft({ ...draft, useAdaptive: !draft.useAdaptive })}
              className={[
                'w-full py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                draft.useAdaptive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
              ].join(' ')}
            >
              {draft.useAdaptive ? '✓ Attivo — propone più le note difficili' : 'Disattivo — casuale uniforme'}
            </button>
          </section>

          {/* Note selection */}
          {draft.clefs.map((clef) => {
            const clefNotes = ALL_NOTES.filter((n) => n.clef === clef);
            const allSelected = clefNotes.every((n) => draft.enabledNotes.includes(noteId(n)));
            return (
              <section key={clef}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                    Note — {clef === 'treble' ? 'Violino' : 'Basso'}
                  </h3>
                  <button
                    onClick={() => toggleAllClef(clef, !allSelected)}
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    {allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clefNotes.map((note) => {
                    const id = noteId(note);
                    const selected = draft.enabledNotes.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleNote(id)}
                        className={[
                          'px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors',
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400',
                        ].join(' ')}
                      >
                        {displayNoteName(note.letter, draft.nameSystem)}{note.octave}
                        {note.isLedger && ' *'}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400 mt-1">* riga addizionale</p>
              </section>
            );
          })}
        </div>

        {/* Save */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors"
          >
            Salva impostazioni
          </button>
        </div>
      </div>
    </div>
  );
}
