'use client';

import InstrumentInput from '@/components/InstrumentInput';
import { useAudioInput } from '@/lib/audioInput';
import { ALL_INSTRUMENT_IDS, getInstrument } from '@/lib/instruments';
import { AudioInputConfig, InstrumentId, NoteNameSystem } from '@/lib/types';

interface AudioInputSettingsProps {
  value: AudioInputConfig;
  nameSystem: NoteNameSystem;
  onChange: (next: AudioInputConfig) => void;
}

/**
 * Microphone input settings, with a live preview: the meter is the only way to
 * tell a silent input apart from a misconfigured one, and opening the stream
 * here is also what earns the device labels from the browser.
 */
export default function AudioInputSettings({ value, nameSystem, onChange }: AudioInputSettingsProps) {
  const audio = useAudioInput({
    enabled: value.enabled,
    deviceId: value.deviceId,
    a4: value.a4,
    instrument: value.instrument,
  });
  const instrument = getInstrument(value.instrument);

  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Strumento</h3>

      <button
        onClick={() => onChange({ ...value, enabled: !value.enabled })}
        className={[
          'w-full py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
          value.enabled
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
        ].join(' ')}
      >
        {value.enabled ? '✓ Attivo — suona la nota invece di premerla' : 'Disattivo — solo pulsanti'}
      </button>

      {value.enabled && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {ALL_INSTRUMENT_IDS.map((id) => {
              const option = getInstrument(id);
              return (
                <button
                  key={id}
                  onClick={() => onChange({ ...value, instrument: id as InstrumentId })}
                  className={[
                    'px-2 py-2 rounded-xl text-xs font-semibold border-2 transition-colors',
                    value.instrument === id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
                  ].join(' ')}
                >
                  <span className="block text-base leading-none mb-1">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>

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

          {instrument.soundsLike && (
            <p className="text-xs text-zinc-400">
              Strumento traspositore: la nota scritta suona {instrument.soundsLike}. Il riquadro qui sopra
              mostra la nota come la leggi sul rigo, e sotto di essa il suono reale.
            </p>
          )}

          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Ingresso audio</span>
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

          <button
            onClick={() => onChange({ ...value, strictOctave: !value.strictOctave })}
            className={[
              'w-full px-4 py-2 rounded-xl text-left border-2 transition-colors',
              value.strictOctave
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
            ].join(' ')}
          >
            <span className="block text-sm font-semibold">Ottava esatta</span>
            <span className={['block text-xs', value.strictOctave ? 'text-indigo-100' : 'text-zinc-400'].join(' ')}>
              {value.strictOctave
                ? `La nota va suonata nell’ottava scritta${instrument.soundsLike ? ` (${instrument.label}: suono ${instrument.soundsLike})` : ''}`
                : 'Basta il nome della nota, in qualsiasi ottava'}
            </span>
          </button>

          <p className="text-xs text-zinc-400">
            Suona una nota e controlla che il livello si muova e il nome sia giusto. Se lo strumento è scordato,
            le risposte risulteranno sbagliate.
          </p>
        </div>
      )}
    </section>
  );
}
