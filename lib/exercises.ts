import { sheetNoteCount } from './sheet.ts';
import type { ExerciseConfig, NoteDrillMode, NotePoolConfig, TrainingMode } from './types.ts';

export type ExerciseGroup = 'reading' | 'theory';

export interface Exercise {
  mode: TrainingMode;
  /** URL segment under /esercizi */
  slug: string;
  /** Which section of the config holds this exercise's settings */
  section: Exclude<keyof ExerciseConfig, 'nameSystem' | 'audio'>;
  group: ExerciseGroup;
  glyph: string;
  title: string;
  /** One line for the home card: what you see, then what you do */
  summary: string;
  /** A little more, for the top of the exercise's own page */
  description: string;
  /** Left off the home page for now; its page still opens from its address */
  hidden?: boolean;
}

export const EXERCISES: Exercise[] = [
  {
    mode: 'notes',
    slug: 'leggi-note',
    section: 'notes',
    group: 'reading',
    glyph: '𝄞',
    title: 'Leggi le note',
    summary: 'Leggi uno spartito e tocchi il nome di ogni nota',
    description: 'Uno spartito da leggere da sinistra a destra: tocca il nome di ogni nota, fino alla fine.',
  },
  {
    mode: 'notes-challenge',
    slug: 'sfida-a-tempo',
    section: 'notesChallenge',
    group: 'reading',
    glyph: '⏱',
    title: 'Sfida a tempo',
    summary: 'Leggi più note che puoi prima che scada il tempo',
    description: 'Tocca il nome delle note che compaiono, una o qualche battuta alla volta: più ne leggi prima che scada il tempo, meglio è.',
    hidden: true,
  },
  {
    mode: 'play',
    slug: 'suona-note',
    section: 'play',
    group: 'reading',
    glyph: '🎸',
    title: 'Suona le note',
    summary: 'Leggi uno spartito e lo suoni sul tuo strumento: il microfono ti ascolta',
    description:
      'Uno spartito da suonare sul tuo strumento. Il microfono riconosce cosa hai suonato e passa alla nota successiva.',
  },
  {
    mode: 'play-challenge',
    slug: 'sfida-suonando',
    section: 'playChallenge',
    group: 'reading',
    glyph: '⏱',
    title: 'Sfida a tempo, suonando',
    summary: 'Suoni più note che puoi prima che scada il tempo',
    description: 'Suona le note che compaiono, una o qualche battuta alla volta: più ne suoni prima che scada il tempo, meglio è.',
    hidden: true,
  },
  {
    mode: 'fifths',
    slug: 'tonalita',
    section: 'fifths',
    group: 'theory',
    glyph: '♯♭',
    title: 'Tonalità',
    summary: 'Da un’armatura riconosci la tonalità, o dalla tonalità conti le alterazioni',
    description:
      'Vedi un’armatura di chiave e scegli la tonalità maggiore che indica, oppure parti dal nome di una tonalità e dici quante alterazioni ha.',
  },
  {
    mode: 'relatives',
    slug: 'relative',
    section: 'relatives',
    group: 'theory',
    glyph: 'M/m',
    title: 'Relative',
    summary: 'Da una tonalità maggiore trovi la relativa minore, e viceversa',
    description:
      'Ti viene data una tonalità maggiore e scegli la sua relativa minore, quella con la stessa armatura. O al contrario, dalla minore alla maggiore.',
  },
  {
    mode: 'intervals',
    slug: 'intervalli',
    section: 'intervals',
    group: 'theory',
    glyph: 'M3',
    title: 'Riconosci gli intervalli',
    summary: 'Vedi due note e dici che intervallo formano (es. 3ª maggiore)',
    description:
      'Compaiono due note, sul pentagramma o scritte per nome: scegli l’intervallo che le separa, con grado e qualità.',
  },
  {
    mode: 'interval-build',
    slug: 'costruisci-intervalli',
    section: 'intervalBuild',
    group: 'theory',
    glyph: '♪→?',
    title: 'Costruisci gli intervalli',
    summary: 'Da una nota e un intervallo trovi la nota d’arrivo',
    description:
      'Ti viene data una nota di partenza e un intervallo ascendente, per esempio “Re, sale di una 3ª minore”: scegli la nota a cui arrivi.',
  },
  {
    mode: 'scales',
    slug: 'scale',
    section: 'scales',
    group: 'theory',
    glyph: '♪↗',
    title: 'Scale',
    summary: 'Dal nome di una scala componi le sue note in ordine',
    description:
      'Ti viene chiesta una scala, maggiore o minore: inserisci le sue note una dopo l’altra, con le alterazioni giuste.',
  },
];

export const EXERCISE_GROUP_LABEL: Record<ExerciseGroup, string> = {
  reading: 'Lettura',
  theory: 'Teoria',
};

export function getExercise(mode: TrainingMode): Exercise {
  const exercise = EXERCISES.find((e) => e.mode === mode);
  if (!exercise) throw new Error(`Unknown exercise ${mode}`);
  return exercise;
}

export function exerciseBySlug(slug: string): Exercise | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}

export function exerciseHref(exercise: Exercise): string {
  return `/esercizi/${exercise.slug}`;
}

export function isNoteDrillMode(mode: TrainingMode): mode is NoteDrillMode {
  return mode === 'notes' || mode === 'play' || mode === 'notes-challenge' || mode === 'play-challenge';
}

/** What a note-reading session needs, whichever of the four exercises it is */
export interface NoteDrill extends NotePoolConfig {
  /** Answered on the instrument rather than by name */
  listening: boolean;
  /** Notes on screen at once: one alone, or a written piece of whole bars */
  notesAtOnce: number;
  /** 0 = no clock: one piece is read through, and that is the session */
  durationSeconds: number;
}

export function noteDrill(mode: NoteDrillMode, config: ExerciseConfig): NoteDrill {
  const listening = mode === 'play' || mode === 'play-challenge';
  if (mode === 'notes' || mode === 'play') {
    const { measures, ...pool } = config[mode];
    return { ...pool, listening, notesAtOnce: sheetNoteCount(measures), durationSeconds: 0 };
  }
  return { ...config[mode === 'notes-challenge' ? 'notesChallenge' : 'playChallenge'], listening };
}
