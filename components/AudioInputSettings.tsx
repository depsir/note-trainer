'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import InstrumentInput from '@/components/InstrumentInput';
import { ChoiceCard, Choice, OptionSection } from '@/components/options';
import { useAudioInput } from '@/lib/audioInput';
import { ALL_INSTRUMENT_IDS, getInstrument } from '@/lib/instruments';
import { AudioInputConfig, InstrumentId, NoteNameSystem } from '@/lib/types';

interface AudioInputSettingsProps {
  value: AudioInputConfig;
  nameSystem: NoteNameSystem;
  onChange: (next: AudioInputConfig) => void;
}

/** Which instrument, which input, how strict — with a live meter to check the input before starting. */
export default function AudioInputSettings({ value, nameSystem, onChange }: AudioInputSettingsProps) {
  const [testing, setTesting] = useState(false);
  const audio = useAudioInput({
    // Opt-in rather than opened with the page: asking for the microphone before
    // anyone has touched anything is the prompt people learn to dismiss.
    enabled: testing,
    deviceId: value.deviceId,
    a4: value.a4,
    instrument: value.instrument,
  });

  return (
    <>
      <OptionSection title="Strumento">
        <div className="grid grid-cols-3 gap-2">
          {ALL_INSTRUMENT_IDS.map((id) => {
            const option = getInstrument(id);
            return (
              <Choice
                key={id}
                selected={value.instrument === id}
                onClick={() => onChange({ ...value, instrument: id as InstrumentId })}
                className="px-2 py-2 text-xs"
              >
                <span className="block text-base leading-none mb-1">{option.icon}</span>
                {option.label}
              </Choice>
            );
          })}
        </div>
      </OptionSection>

      <OptionSection title="Microfono">
          {testing ? (
            <div className="space-y-3">
              <InstrumentInput
                status={audio.status}
                error={audio.error}
                level={audio.level}
                heard={audio.heard}
                nameSystem={nameSystem}
                instrument={value.instrument}
                // The preview has no question on screen; treble is the clef the
                // transposing instruments here are written in anyway.
                clef="treble"
              />
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Ingresso audio</span>
                <select
                  value={value.deviceId}
                  onChange={(event) => onChange({ ...value, deviceId: event.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                >
                  <option value="">Predefinito di sistema</option>
                  {audio.devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Ingresso ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => setTesting(false)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Chiudi la prova
              </button>
            </div>
          ) : (
            <button
              onClick={() => setTesting(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Mic size={16} /> Prova il microfono
            </button>
          )}
        </OptionSection>

      <OptionSection title="Ottava">
        <div className="flex flex-col gap-2">
          <ChoiceCard
            selected={!value.strictOctave}
            onClick={() => onChange({ ...value, strictOctave: false })}
            title="Qualsiasi ottava"
          />
          <ChoiceCard
            selected={value.strictOctave}
            onClick={() => onChange({ ...value, strictOctave: true })}
            title="Ottava esatta"
          />
        </div>
      </OptionSection>
    </>
  );
}
