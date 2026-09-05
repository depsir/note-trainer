'use client';

import AnswerButton from '@/components/AnswerButton';
import { ALL_DEGREES, displayIntervalAnswer, IntervalGridRow, intervalAnswerId } from '@/lib/intervals';

interface IntervalButtonsProps {
  /** One row per quality, one column per degree (always the full 2nd-8th set) */
  rows: IntervalGridRow[];
  onSelect: (answerId: string) => void;
  disabled?: boolean;
  wrongAnswerId?: string | null;
}

/**
 * Interval answer keypad: rows are quality (diminished / minor / major-or-perfect /
 * augmented), columns are degree (2nd-8th) — mirrors KeyButtons' letter-column layout.
 */
export default function IntervalButtons({ rows, onSelect, disabled, wrongAnswerId }: IntervalButtonsProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {rows.map((row) => (
        <div key={row.rowKind} className="grid grid-cols-7 gap-1.5">
          {row.cells.map((cell, column) => {
            const key = `${row.rowKind}-${ALL_DEGREES[column]}`;
            return cell ? (
              <AnswerButton
                key={key}
                compact
                label={displayIntervalAnswer(cell.degree, cell.quality)}
                onClick={() => onSelect(intervalAnswerId(cell.degree, cell.quality))}
                disabled={disabled}
                wrong={wrongAnswerId === intervalAnswerId(cell.degree, cell.quality)}
              />
            ) : (
              <div key={key} aria-hidden />
            );
          })}
        </div>
      ))}
    </div>
  );
}
