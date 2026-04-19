'use client';

import { useEffect, useRef, useState } from 'react';
import { Clef } from '@/lib/types';

interface StaffDisplayProps {
  vexKey: string;
  clef: Clef;
  /** Flash color: 'correct' | 'wrong' | null */
  flash?: 'correct' | 'wrong' | null;
}

export default function StaffDisplay({ vexKey, clef, flash }: StaffDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<unknown>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const inkColor = isDark ? '#d4d4d8' : '#18181b';

    // Dynamically import VexFlow to avoid SSR issues
    import('vexflow').then(({ Renderer, Stave, StaveNote, Voice, Formatter }) => {
      const container = containerRef.current!;
      container.innerHTML = '';

      const width = container.clientWidth || 320;
      const height = 160;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);
      rendererRef.current = renderer;

      const context = renderer.getContext();
      context.setFont('Arial', 10);
      context.setFillStyle(inkColor);
      context.setStrokeStyle(inkColor);

      const staveX = 20;
      const staveWidth = width - 40;
      const stave = new Stave(staveX, 30, staveWidth);
      stave.addClef(clef);
      stave.setContext(context).draw();

      // Parse vexKey: "c/4" → keys: ["c/4"], duration: "q"
      const note = new StaveNote({
        keys: [vexKey],
        duration: 'q',
        clef,
      });

      // Color the note based on flash, otherwise match ink color
      if (flash === 'correct') {
        note.setStyle({ fillStyle: '#22c55e', strokeStyle: '#22c55e' });
      } else if (flash === 'wrong') {
        note.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
      } else {
        note.setStyle({ fillStyle: inkColor, strokeStyle: inkColor });
      }

      const voice = new Voice({ numBeats: 1, beatValue: 4 });
      voice.setStrict(false);
      voice.addTickables([note]);

      new Formatter().joinVoices([voice]).format([voice], staveWidth - 80);
      voice.draw(context, stave);
    });
  }, [vexKey, clef, flash, isDark]);

  // Re-render on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      // Trigger re-render by dispatching a synthetic update — handled by the main effect
      el.dispatchEvent(new Event('resize'));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ minHeight: 160 }}
    />
  );
}
