'use client';

import AnswerButton from '@/components/AnswerButton';
import { countAnswerId, displayCountAnswer, MAX_ACCIDENTALS } from '@/lib/fifths';
import { AccidentalType } from '@/lib/types';

interface AccidentalCountButtonsProps {
  /** Which accidental rows to offer — driven by the configured key pool */
  types: Exclude<AccidentalType, 'none'>[];
  onSelect: (answerId: string) => void;
  disabled?: boolean;
  wrongAnswerId?: string | null;
}

const COUNTS = Array.from({ length: MAX_ACCIDENTALS }, (_, i) => i + 1);
const ZERO_ID = countAnswerId(0, 'none');

/**
 * A signed count keypad: flats above, sharps below, "0" in the middle. The sign matters
 * because "2 alterazioni" is both D major and B♭ major.
 * Each row is its own grid so the centred "0" cannot shift the row beneath it.
 */
export default function AccidentalCountButtons({
  types,
  onSelect,
  disabled,
  wrongAnswerId,
}: AccidentalCountButtonsProps) {
  const renderRow = (type: Exclude<AccidentalType, 'none'>) => (
    <div className="grid grid-cols-7 gap-1.5">
      {COUNTS.map((count) => {
        const id = countAnswerId(count, type);
        return (
          <AnswerButton
            key={id}
            compact
            label={displayCountAnswer(count, type)}
            onClick={() => onSelect(id)}
            disabled={disabled}
            wrong={wrongAnswerId === id}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {types.includes('flat') && renderRow('flat')}
      <div className="grid grid-cols-7 gap-1.5">
        <div className="col-start-4">
          <AnswerButton
            compact
            label={displayCountAnswer(0, 'none')}
            onClick={() => onSelect(ZERO_ID)}
            disabled={disabled}
            wrong={wrongAnswerId === ZERO_ID}
          />
        </div>
      </div>
      {types.includes('sharp') && renderRow('sharp')}
    </div>
  );
}
