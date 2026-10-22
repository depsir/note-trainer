import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { EXERCISE_GROUP_LABEL, EXERCISES, ExerciseGroup, exerciseHref } from '@/lib/exercises';

const GROUPS: ExerciseGroup[] = ['reading', 'theory'];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-8">
        {GROUPS.map((group) => (
          <section key={group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`} className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {EXERCISE_GROUP_LABEL[group]}
            </h2>
            <ul className="space-y-3">
              {EXERCISES.filter((exercise) => exercise.group === group && !exercise.hidden).map((exercise) => (
                <li key={exercise.mode}>
                  <Link
                    href={exerciseHref(exercise)}
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <span className="text-2xl leading-none font-serif text-indigo-600 w-14 text-center shrink-0 whitespace-nowrap" aria-hidden>
                      {exercise.glyph}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-zinc-800 dark:text-zinc-100">{exercise.title}</span>
                      <span className="block text-sm leading-snug text-zinc-500">{exercise.summary}</span>
                    </span>
                    <span aria-hidden className="text-zinc-300 dark:text-zinc-600 text-xl">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
