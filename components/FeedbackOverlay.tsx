'use client';

interface FeedbackOverlayProps {
  type: 'correct' | 'wrong' | null;
}

export default function FeedbackOverlay({ type }: FeedbackOverlayProps) {
  if (!type) return null;

  return (
    <div
      className={[
        'absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none',
        'text-4xl font-black animate-fade-out',
        type === 'correct' ? 'text-green-500' : 'text-red-500',
      ].join(' ')}
    >
      {type === 'correct' ? '✓' : '✗'}
    </div>
  );
}
