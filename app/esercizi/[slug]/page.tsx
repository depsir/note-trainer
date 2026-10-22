import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExerciseScreen from '@/components/ExerciseScreen';
import { EXERCISES, exerciseBySlug } from '@/lib/exercises';

interface ExercisePageProps {
  params: Promise<{ slug: string }>;
}

// Every exercise is known up front: anything else under /esercizi is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return EXERCISES.map((exercise) => ({ slug: exercise.slug }));
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const exercise = exerciseBySlug((await params).slug);
  return exercise ? { title: `${exercise.title} · Note Coach`, description: exercise.summary } : {};
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const exercise = exerciseBySlug((await params).slug);
  if (!exercise) notFound();
  return <ExerciseScreen mode={exercise.mode} />;
}
