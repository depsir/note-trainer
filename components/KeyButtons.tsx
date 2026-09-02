'use client';

import AnswerButton from '@/components/AnswerButton';
import { displayKeyName, KeyGridRow } from '@/lib/fifths';
import { NoteNameSystem } from '@/lib/types';

interface KeyButtonsProps {
  /** One row per accidental, seven letter columns each */
  rows: KeyGridRow[];
  onSelect: (keyId: string) => void;
  disabled?: boolean;
  wrongKeyId?: string | null;
  nameSystem: NoteNameSystem;
}

/**
 * Every practised tonality as its own button, laid out as a letter-column grid so a
 * given key always sits in the same place and the sharp/flat sides stay readable.
 */
export default function KeyButtons({ rows, onSelect, disabled, wrongKeyId, nameSystem }: KeyButtonsProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5 w-full">
      {rows.flatMap((row) =>
        row.cells.map((key, column) =>
          key ? (
            <AnswerButton
              key={`${row.accidental}-${column}`}
              compact
              label={displayKeyName(key, nameSystem)}
              onClick={() => onSelect(key.id)}
              disabled={disabled}
              wrong={wrongKeyId === key.id}
            />
          ) : (
            <div key={`${row.accidental}-${column}`} aria-hidden />
          )
        )
      )}
    </div>
  );
}
