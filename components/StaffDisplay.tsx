'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersDark } from '@/lib/client';
import { Clef } from '@/lib/types';

interface StaffDisplayProps {
  vexKey: string;
  clef: Clef;
  flash?: 'correct' | 'wrong' | null;
}

const STAFF_HEIGHT = 220;
const STAFF_SIDE_PADDING = 16;
const MAX_STAFF_WIDTH = 272;
const STAFF_SCALE = 1.22;
const MAX_RENDER_WIDTH = Math.round((MAX_STAFF_WIDTH + STAFF_SIDE_PADDING * 2) / STAFF_SCALE);
let vexflowFontsReady: Promise<void> | null = null;

export default function StaffDisplay({ vexKey, clef, flash }: StaffDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const isDark = usePrefersDark();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || width === 0) return;

    let cancelled = false;
    const noteColor = flash === 'correct'
      ? '#22c55e'
      : flash === 'wrong'
        ? '#ef4444'
        : isDark
          ? '#d4d4d8'
          : '#18181b';

    void import('vexflow').then(async ({ Formatter, Renderer, Stave, StaveNote, VexFlow, Voice }) => {
      if (cancelled || !containerRef.current) return;

      if (!vexflowFontsReady) {
        vexflowFontsReady = VexFlow.loadFonts('Bravura', 'Academico').then(() => {
          VexFlow.setFonts('Bravura', 'Academico');
        });
      }

      await vexflowFontsReady;
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;
      container.innerHTML = '';

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, STAFF_HEIGHT);

      const context = renderer.getContext();
      const staveWidth = Math.min(width - STAFF_SIDE_PADDING * 2, MAX_STAFF_WIDTH);
      const staveX = Math.max(STAFF_SIDE_PADDING, Math.round((width - staveWidth) / 2));
      const staveY = 44;
      const stave = new Stave(staveX, staveY, staveWidth);

      context.setFillStyle(isDark ? '#d4d4d8' : '#18181b');
      context.setStrokeStyle(isDark ? '#d4d4d8' : '#18181b');
      context.setLineWidth(1.5);

      stave.setContext(context);
      stave.addClef(clef);
      stave.draw();

      const note = new StaveNote({
        keys: [vexKey],
        duration: 'q',
        clef,
      });

      note.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });

      const voice = new Voice({ numBeats: 1, beatValue: 4 });
      voice.addTickables([note]);

      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(context, stave);

      const svg = container.querySelector('svg');
      if (svg) {
        svg.style.transform = `scale(${STAFF_SCALE})`;
        svg.style.transformOrigin = 'center center';
      }
    });

    return () => {
      cancelled = true;
      if (element) {
        element.innerHTML = '';
      }
    };
  }, [width, vexKey, clef, flash, isDark]);

  return (
    <div className="flex w-full justify-center overflow-visible">
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: STAFF_HEIGHT, maxWidth: MAX_RENDER_WIDTH }}
      />
    </div>
  );
}
