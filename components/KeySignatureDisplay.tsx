'use client';

import { useEffect, useRef } from 'react';
import { usePrefersDark } from '@/lib/client';
import { loadVexFlow } from '@/lib/vexflow';
import { Clef } from '@/lib/types';

interface KeySignatureDisplayProps {
  /** VexFlow key spec, e.g. "F#" — matches MajorKey.id */
  keySpec: string;
  clef: Clef;
  flash?: 'correct' | 'wrong' | null;
}

/**
 * Fixed drawing box so every signature renders at the same scale: C major must not
 * make the staff bigger than C# major. The box is wide enough for a clef plus seven
 * accidentals; CSS scales the SVG to the container through its viewBox.
 */
const CANVAS_WIDTH = 166;
const CANVAS_HEIGHT = 120;
const STAVE_X = 8;
const STAVE_WIDTH = CANVAS_WIDTH - STAVE_X * 2;
/** Stave draws its top line `spaceAboveStaffLn` (4) × line spacing (10) below its y */
const STAFF_TOP_OFFSET = 40;
const STAFF_SPAN = 40;
const STAVE_Y = CANVAS_HEIGHT / 2 - STAFF_TOP_OFFSET - STAFF_SPAN / 2;

export default function KeySignatureDisplay({ keySpec, clef, flash }: KeySignatureDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = usePrefersDark();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let cancelled = false;
    const ink = isDark ? '#d4d4d8' : '#18181b';
    const accidentalColor = flash === 'correct' ? '#22c55e' : flash === 'wrong' ? '#ef4444' : null;

    void loadVexFlow().then(({ Renderer, Stave }) => {
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;
      container.innerHTML = '';

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(CANVAS_WIDTH, CANVAS_HEIGHT);

      const context = renderer.getContext();
      context.setFillStyle(ink);
      context.setStrokeStyle(ink);
      context.setLineWidth(1.5);

      const stave = new Stave(STAVE_X, STAVE_Y, STAVE_WIDTH);
      stave.setContext(context);
      stave.addClef(clef);
      stave.addKeySignature(keySpec);
      stave.draw();

      const svg = container.querySelector('svg');
      if (!svg) return;
      svg.setAttribute('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
      // Renderer.resize pins an inline pixel width/height that would beat the
      // stylesheet, leaving the staff unscaled in the corner of its box.
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.overflow = 'visible';

      // Tint only the accidentals on feedback — the clef and staff keep the ink colour.
      if (accidentalColor) {
        svg.querySelectorAll<SVGElement>('.vf-keysignature, .vf-keysignature *').forEach((node) => {
          node.style.fill = accidentalColor;
          node.style.stroke = accidentalColor;
        });
      }
    });

    return () => {
      cancelled = true;
      element.innerHTML = '';
    };
  }, [keySpec, clef, flash, isDark]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-visible"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    />
  );
}
