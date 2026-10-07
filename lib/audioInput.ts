'use client';

import { useEffect, useRef, useState } from 'react';
import { getInstrument } from './instruments.ts';
import { detectPitch, frequencyToNote, levelToMeter, rms, type DetectedNote } from './pitch.ts';
import type { InstrumentId } from './types.ts';

/**
 * Live note input from an instrument plugged into an audio interface, or from
 * the microphone. The detector itself lives in ./pitch — this only owns the
 * audio graph, the noise gate, and the decision of when a played note counts as
 * an answer.
 *
 * What counts as a new note depends on the instrument: see the onset profiles
 * in ./instruments.
 */

/** Window handed to the detector: 2048 frames is ~46 ms, four periods of a low E. */
const FFT_SIZE = 2048;
/** Mains hum and body thump sit below the guitar's range and only confuse the detector. */
const HIGHPASS_HZ = 70;
/** Below this level the input counts as silence. */
const NOISE_GATE = 0.01;
/** Where the noise gate sits on the meter, so a player can see whether they clear it. */
export const NOISE_GATE_METER = levelToMeter(NOISE_GATE);
/** How periodic a window must look before its pitch is believed. */
const MIN_CLARITY = 0.9;
/** Frames that must agree on the same pitch before it counts as played. */
const STABLE_FRAMES = 3;
/** Nothing is accepted for this long after a note lands. */
const LOCKOUT_MS = 350;
/**
 * The detector's window is ~46 ms long, so right after an attack it still holds
 * the pick or tongue noise. Nothing is accepted until the window has filled
 * with the note itself, or a transient can read as a stable wrong answer.
 */
const ATTACK_SETTLE_MS = 60;
/** The meter and the readout refresh at this interval, not once per frame. */
const DISPLAY_INTERVAL_MS = 50;
/** The readout keeps showing the last note this long, so it does not flicker between plucks. */
const READOUT_HOLD_MS = 600;

export type AudioInputStatus = 'off' | 'starting' | 'listening' | 'denied' | 'unsupported' | 'error';

export interface HeardNote extends DetectedNote {
  frequency: number;
  clarity: number;
  /** When the note was accepted, in `Date.now()` terms */
  at: number;
}

export interface AudioInputOptions {
  enabled: boolean;
  deviceId: string;
  a4: number;
  /** Decides how a new note is told apart from the one still sounding */
  instrument: InstrumentId;
  /** Keep listening and metering, but accept nothing */
  paused?: boolean;
  /** Fired once per played note, after its pitch settles */
  onNote?: (note: HeardNote) => void;
}

export interface AudioInput {
  status: AudioInputStatus;
  error: string | null;
  /** Input level on a 0–1 meter scale that is linear in decibels */
  level: number;
  /** What is being heard right now, or null when the input is quiet */
  heard: (DetectedNote & { frequency: number; clarity: number }) | null;
  /** Available input devices; labels only appear once permission is granted */
  devices: MediaDeviceInfo[];
}

function describeError(error: unknown): { status: AudioInputStatus; message: string } {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { status: 'denied', message: 'Permesso microfono negato' };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { status: 'error', message: 'Nessun ingresso audio disponibile' };
  }
  if (name === 'NotReadableError') {
    return { status: 'error', message: "L'ingresso audio è occupato da un'altra app" };
  }
  return { status: 'error', message: "Impossibile aprire l'ingresso audio" };
}

async function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((device) => device.kind === 'audioinput');
  } catch {
    // A device list is a nicety; failing to get one is not worth surfacing.
    return [];
  }
}

export function useAudioInput({ enabled, deviceId, a4, instrument, paused, onNote }: AudioInputOptions): AudioInput {
  const [status, setStatus] = useState<AudioInputStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState<AudioInput['heard']>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const armedRef = useRef(false);
  const envelopeRef = useRef(0);
  const candidateMidiRef = useRef<number | null>(null);
  const candidateFramesRef = useRef(0);
  const acceptedAtRef = useRef(0);
  const acceptedMidiRef = useRef<number | null>(null);

  // Kept in refs so that changing them never tears the audio graph down.
  const onNoteRef = useRef(onNote);
  const pausedRef = useRef(paused);
  const a4Ref = useRef(a4);
  const onsetRef = useRef(getInstrument(instrument).onset);
  useEffect(() => { onNoteRef.current = onNote; }, [onNote]);
  useEffect(() => { a4Ref.current = a4; }, [a4]);
  useEffect(() => { onsetRef.current = getInstrument(instrument).onset; }, [instrument]);
  useEffect(() => {
    pausedRef.current = paused;
    // Coming back from a pause must not let a still-ringing string answer:
    // require a fresh attack or a moment of silence first.
    if (paused) armedRef.current = false;
  }, [paused]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let frameHandle = 0;

    armedRef.current = false;
    envelopeRef.current = 0;
    candidateMidiRef.current = null;
    candidateFramesRef.current = 0;
    acceptedMidiRef.current = null;

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        setError('Questo browser non espone gli ingressi audio');
        return;
      }

      setStatus('starting');
      setError(null);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // The browser's voice processing flattens exactly the detail the
          // detector needs, so all three are off.
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
      } catch (caught) {
        if (cancelled) return;
        const described = describeError(caught);
        setStatus(described.status);
        setError(described.message);
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Device labels stay blank until permission is granted, so this is the
      // first moment the picker can show real names.
      void listAudioInputs().then((inputs) => {
        if (!cancelled) setDevices(inputs);
      });

      audioContext = new AudioContext({ latencyHint: 'interactive' });
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const highpass = audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = HIGHPASS_HZ;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      // A stereo interface is down-mixed here, so it does not matter which of
      // its inputs the guitar is plugged into.
      source.connect(highpass);
      highpass.connect(analyser);

      const samples = new Float32Array(analyser.fftSize);
      const sampleRate = audioContext.sampleRate;
      let lastDisplayAt = 0;
      let lastHeardAt = 0;
      let attackAt = 0;

      setStatus('listening');

      const tick = () => {
        frameHandle = requestAnimationFrame(tick);
        analyser.getFloatTimeDomainData(samples);

        const now = Date.now();
        const onset = onsetRef.current;
        const currentLevel = rms(samples);
        const isSilent = currentLevel < NOISE_GATE;
        // Compared against the envelope *before* this frame, so that the rise
        // of a new note is still visible.
        const isAttack = !isSilent && currentLevel > envelopeRef.current * onset.attackRatio;
        envelopeRef.current = Math.max(currentLevel, envelopeRef.current * onset.envelopeDecay);

        if (isAttack) attackAt = now;

        const canArm = !pausedRef.current && now - acceptedAtRef.current > LOCKOUT_MS;
        if (!armedRef.current && canArm && (isSilent || isAttack)) {
          armedRef.current = true;
        }

        const estimate = isSilent ? null : detectPitch(samples, sampleRate);
        const clear = estimate && estimate.clarity >= MIN_CLARITY ? estimate : null;
        const note = clear ? frequencyToNote(clear.frequency, a4Ref.current) : null;

        if (note && clear) {
          if (note.midi === candidateMidiRef.current) {
            candidateFramesRef.current += 1;
          } else {
            candidateMidiRef.current = note.midi;
            candidateFramesRef.current = 1;
          }

          const stable = candidateFramesRef.current >= STABLE_FRAMES;
          // Slurring to a different note is the only sign a sustaining
          // instrument gives that it has moved on. Repeating the *same* note
          // without tonguing it is indistinguishable from holding it, so that
          // one still needs an attack.
          if (!armedRef.current && canArm && onset.rearmOnPitchChange && stable && note.midi !== acceptedMidiRef.current) {
            armedRef.current = true;
          }

          const settled = now - attackAt >= ATTACK_SETTLE_MS;
          if (armedRef.current && !pausedRef.current && settled && stable) {
            armedRef.current = false;
            acceptedAtRef.current = now;
            acceptedMidiRef.current = note.midi;
            candidateMidiRef.current = null;
            candidateFramesRef.current = 0;
            onNoteRef.current?.({ ...note, frequency: clear.frequency, clarity: clear.clarity, at: now });
          }
        } else {
          candidateMidiRef.current = null;
          candidateFramesRef.current = 0;
        }

        if (note && clear) lastHeardAt = now;

        if (now - lastDisplayAt >= DISPLAY_INTERVAL_MS) {
          lastDisplayAt = now;
          setLevel(levelToMeter(currentLevel));
          if (note && clear) {
            setHeard({ ...note, frequency: clear.frequency, clarity: clear.clarity });
          } else if (now - lastHeardAt > READOUT_HOLD_MS) {
            setHeard(null);
          }
        }
      };

      frameHandle = requestAnimationFrame(tick);
    };

    void start();

    return () => {
      cancelled = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [enabled, deviceId]);

  useEffect(() => {
    const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;

    let cancelled = false;
    const refresh = () => {
      void listAudioInputs().then((inputs) => {
        if (!cancelled) setDevices(inputs);
      });
    };

    mediaDevices.addEventListener('devicechange', refresh);
    refresh();

    return () => {
      cancelled = true;
      mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, []);

  // Derived rather than stored, so switching the input off never has to push
  // state from inside an effect.
  return enabled
    ? { status, error, level, heard, devices }
    : { status: 'off', error: null, level: 0, heard: null, devices };
}
