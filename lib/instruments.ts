import { writtenMidi } from './notes.ts';
import { midiToSpelled, type SpelledPitch } from './pitch.ts';
import type { Clef, InstrumentId, Note } from './types.ts';

/**
 * Which instrument is answering into the microphone.
 *
 * Most of what the app needs to know about one is how far its written notes sit
 * from the pitch it actually sounds: a clarinet in B♭ reading C sounds B♭, and a
 * guitar reading treble clef sounds an octave below the staff. Everything that
 * compares a heard pitch against the written question goes through here.
 */

/** How the input decides that a new note has been played. */
export interface OnsetProfile {
  /** A fresh note has to be this much louder than the tail of the previous one. */
  attackRatio: number;
  /** How fast the envelope follower falls between notes. */
  envelopeDecay: number;
  /**
   * Whether settling on a different pitch counts as a new note on its own.
   *
   * A plucked string always starts with an attack, so it does not need this. A
   * wind player slurring from one note to the next gives neither an attack nor
   * a moment of silence, and without this the input would stay shut after the
   * first note of a phrase.
   */
  rearmOnPitchChange: boolean;
}

export interface Instrument {
  id: InstrumentId;
  label: string;
  /** Prefixed to the instrument's name on the session screens. */
  icon: string;
  /**
   * Semitones from the written note to the pitch that sounds, per clef.
   *
   * Per clef because the guitar's octave transposition is a convention of its
   * treble-clef parts, not of the instrument: the same part written in bass
   * clef is read at concert pitch, as a piano would.
   */
  transposition: Record<Clef, number>;
  /** How the transposition reads in the settings; empty when there is none. */
  soundsLike: string;
}

const PLUCKED: OnsetProfile = { attackRatio: 1.8, envelopeDecay: 0.97, rearmOnPitchChange: false };
/** A held note neither decays nor re-attacks, so pitch has to do the work. */
const SUSTAINED: OnsetProfile = { attackRatio: 1.25, envelopeDecay: 0.995, rearmOnPitchChange: true };

export const INSTRUMENTS: Record<InstrumentId, Instrument & { onset: OnsetProfile }> = {
  guitar: {
    id: 'guitar',
    label: 'Chitarra',
    icon: '🎸',
    transposition: { treble: -12, bass: 0 },
    soundsLike: 'un’ottava sotto il rigo in chiave di violino',
    onset: PLUCKED,
  },
  'clarinet-bb': {
    id: 'clarinet-bb',
    label: 'Clarinetto Si♭',
    icon: '🎶',
    // A written C sounds B♭: a major second down, in either clef.
    transposition: { treble: -2, bass: -2 },
    soundsLike: 'una seconda maggiore sotto il rigo',
    onset: SUSTAINED,
  },
  concert: {
    id: 'concert',
    label: 'Suono reale',
    icon: '🎹',
    transposition: { treble: 0, bass: 0 },
    soundsLike: '',
    onset: SUSTAINED,
  },
};

export const ALL_INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[];

/** Resolve a stored id, falling back rather than throwing on an unknown one. */
export function getInstrument(id: InstrumentId): Instrument & { onset: OnsetProfile } {
  return INSTRUMENTS[id] ?? INSTRUMENTS.guitar;
}

export function isTransposing(id: InstrumentId, clef: Clef): boolean {
  return getInstrument(id).transposition[clef] !== 0;
}

/** The pitch this instrument actually sounds when reading `note`. */
export function soundingMidi(note: Note, id: InstrumentId): number {
  return writtenMidi(note) + getInstrument(id).transposition[note.clef];
}

/**
 * The note this instrument would have been reading to sound `midi` — what the
 * player sees on the staff, which is what the readout should name.
 */
export function writtenPitch(midi: number, id: InstrumentId, clef: Clef): SpelledPitch {
  return midiToSpelled(midi - getInstrument(id).transposition[clef]);
}

/**
 * Whether a heard pitch answers the written note.
 *
 * Loose mode compares pitch classes rather than note names: for a transposing
 * instrument the right answer often carries an accidental the written note does
 * not have, so names would not line up even when the player is right.
 */
export function heardMatches(
  heardMidi: number,
  note: Note,
  id: InstrumentId,
  strictOctave: boolean
): boolean {
  const expected = soundingMidi(note, id);
  return strictOctave ? heardMidi === expected : (heardMidi - expected) % 12 === 0;
}
