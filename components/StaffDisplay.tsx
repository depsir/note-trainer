'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersDark } from '@/lib/client';
import { Clef } from '@/lib/types';

interface StaffDisplayProps {
  vexKey: string;
  clef: Clef;
  flash?: 'correct' | 'wrong' | null;
}

const STAFF_SCALE_X = 1.4;
const STAFF_SCALE_Y = 2.3;
const STAFF_HEIGHT = 196;
const STAFF_CONTAINER_HEIGHT = Math.round(STAFF_HEIGHT * STAFF_SCALE_Y * 0.72);
const STAFF_SIDE_PADDING = 12;
const MAX_STAFF_WIDTH = 212;
const MAX_RENDER_WIDTH = MAX_STAFF_WIDTH + STAFF_SIDE_PADDING * 2;
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

      const renderWidth = Math.min(width, MAX_RENDER_WIDTH);
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(renderWidth, STAFF_HEIGHT);

      const context = renderer.getContext();
      const staveWidth = Math.min(renderWidth - STAFF_SIDE_PADDING * 2, MAX_STAFF_WIDTH);
      const staveX = Math.max(STAFF_SIDE_PADDING, Math.round((renderWidth - staveWidth) / 2));
      const staveY = 30;
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
        svg.style.display = 'block';
        svg.style.overflow = 'visible';
        svg.style.position = 'absolute';
        svg.style.left = '50%';
        svg.style.top = '50%';
        svg.style.transform = `translate(-50%, -50%) scale(${STAFF_SCALE_X}, ${STAFF_SCALE_Y})`;
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
    <div className="flex w-full justify-center overflow-visible pt-0 pb-1">
      <div
        ref={containerRef}
        className="relative w-full overflow-visible"
        style={{ minHeight: STAFF_CONTAINER_HEIGHT }}
      />
    </div>
  );
}
