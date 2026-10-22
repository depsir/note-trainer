'use client';

import { Choice, OptionSection } from '@/components/options';
import { NoteNameSystem } from '@/lib/types';

export default function NameSystemOption({
  value,
  onChange,
}: {
  value: NoteNameSystem;
  onChange: (value: NoteNameSystem) => void;
}) {
  return (
    <OptionSection title="Nomi delle note">
      <div className="flex gap-3">
        {(['italian', 'english'] as const).map((sys) => (
          <Choice key={sys} selected={value === sys} onClick={() => onChange(sys)} className="flex-1 py-2">
            {sys === 'italian' ? 'Do Re Mi' : 'C D E'}
          </Choice>
        ))}
      </div>
    </OptionSection>
  );
}
