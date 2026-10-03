'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersDark, usePrefersReducedMotion } from '@/lib/client';
import { loadVexFlow } from '@/lib/vexflow';
import { BEATS_PER_MEASURE } from '@/lib/sheet';
import { Clef, Note } from '@/lib/types';

interface SheetStaffDisplayProps {
  /** The whole piece, in reading order */
  notes: Note[];
  clef: Clef;
  /** Index of the note being read; equals `notes.length` once the piece is finished */
  currentIndex: number;
  /** Per answered note, whether it took more than one try */
  fumbled: boolean[];
  /** Wrong tries on the note being read; drives the miss animation, so it has to keep climbing */
  wrongAttempts: number;
}

/** Everything below is in VexFlow's own units; the whole drawing is scaled up once at the end. */
const SCALE = 1.35;
/** Room above the staff for the bar number and for notes on ledger lines */
const STAFF_TOP = 40;
const SYSTEM_HEIGHT = 132;
const NOTE_WIDTH = 46;
const MEASURE_WIDTH = NOTE_WIDTH * BEATS_PER_MEASURE;
/** Extra room the first bar needs for the clef and the time signature */
const FIRST_MEASURE_EXTRA = 70;
const EDGE_PADDING = 10;

/**
 * Where the note being read comes to rest in the viewport, as a fraction of its width.
 * Left of centre on purpose: what is still to be played deserves more room than what is done.
 */
const READING_POSITION = 0.34;

const NOTE_STATE_CLASSES = ['is-pending', 'is-current', 'is-wrong', 'is-done', 'is-fumbled'];

/**
 * The piece as one long staff that scrolls itself as it is read.
 *
 * It is drawn once per piece and then only recoloured: a redraw would wipe the SVG and
 * with it the scroll position, which is the one thing that has to stay continuous here.
 * Note state therefore rides on CSS classes (see `globals.css`), which outrank the
 * presentation attributes VexFlow writes onto its own paths.
 */
export default function SheetStaffDisplay({ notes, clef, currentIndex, fumbled, wrongAttempts }: SheetStaffDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const noteElementsRef = useRef<SVGElement[]>([]);
  const [drawnAt, setDrawnAt] = useState(0);
  const isDark = usePrefersDark();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = staffRef.current;
    if (!element) return;

    let cancelled = false;
    noteElementsRef.current = [];

    void loadVexFlow().then(({ Barline, Formatter, Renderer, Stave, StaveNote, Voice }) => {
      if (cancelled || !staffRef.current) return;

      const container = staffRef.current;
      container.innerHTML = '';

      const measures = Math.ceil(notes.length / BEATS_PER_MEASURE);
      const totalWidth = EDGE_PADDING * 2 + FIRST_MEASURE_EXTRA + MEASURE_WIDTH * measures;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(Math.round(totalWidth * SCALE), Math.round(SYSTEM_HEIGHT * SCALE));

      const context = renderer.getContext();
      context.scale(SCALE, SCALE);

      const ink = isDark ? '#d4d4d8' : '#18181b';
      context.setFillStyle(ink);
      context.setStrokeStyle(ink);
      context.setLineWidth(1.2);

      const drawn: SVGElement[] = [];
      let x = EDGE_PADDING;

      for (let measure = 0; measure < measures; measure++) {
        const isFirst = measure === 0;
        const width = MEASURE_WIDTH + (isFirst ? FIRST_MEASURE_EXTRA : 0);
        const stave = new Stave(x, STAFF_TOP, width);

        if (isFirst) {
          stave.addClef(clef);
          stave.addTimeSignature(`${BEATS_PER_MEASURE}/4`);
        } else {
          // Every bar but the first already has the previous bar's line to its left.
          stave.setBegBarType(Barline.type.NONE);
        }
        if (measure === measures - 1) stave.setEndBarType(Barline.type.END);
        stave.setMeasure(measure + 1);
        stave.setContext(context).draw();

        const bar = notes.slice(measure * BEATS_PER_MEASURE, (measure + 1) * BEATS_PER_MEASURE);
        const staveNotes = bar.map((note) => new StaveNote({ keys: [note.vexKey], duration: 'q', clef }));

        const voice = new Voice({ numBeats: BEATS_PER_MEASURE, beatValue: 4 }).setStrict(false);
        voice.addTickables(staveNotes);
        new Formatter().joinVoices([voice]).formatToStave([voice], stave);
        voice.draw(context, stave);

        staveNotes.forEach((staveNote) => {
          const group = staveNote.getSVGElement();
          if (!group) return;
          group.classList.add('sheet-note');
          drawn.push(group);
        });

        x += width;
      }

      noteElementsRef.current = drawn;
      // Colouring and scrolling both hang off the elements this pass produced.
      setDrawnAt((count) => count + 1);
    });

    return () => {
      cancelled = true;
      noteElementsRef.current = [];
      element.innerHTML = '';
    };
  }, [notes, clef, isDark]);

  useEffect(() => {
    noteElementsRef.current.forEach((group, index) => {
      const state =
        index < currentIndex
          ? fumbled[index] ? 'is-fumbled' : 'is-done'
          : index === currentIndex
            ? wrongAttempts > 0 ? 'is-wrong' : 'is-current'
            : 'is-pending';
      group.classList.remove(...NOTE_STATE_CLASSES);
      if (state === 'is-wrong') {
        // Re-adding the class is what replays the miss animation on a second wrong try;
        // reading a layout value in between is what makes the browser notice.
        void group.getBoundingClientRect();
      }
      group.classList.add(state);
    });
  }, [currentIndex, fumbled, wrongAttempts, drawnAt]);

  useEffect(() => {
    const scroller = scrollRef.current;
    // Past the last note there is nothing to centre on, so the end of the piece stays put.
    const target = noteElementsRef.current[currentIndex];
    if (!scroller || !target) return;

    const noteBox = target.getBoundingClientRect();
    const viewBox = scroller.getBoundingClientRect();
    const offset = noteBox.left + noteBox.width / 2 - viewBox.left - viewBox.width * READING_POSITION;
    scroller.scrollTo({ left: scroller.scrollLeft + offset, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [currentIndex, drawnAt, reducedMotion]);

  return (
    <div
      ref={scrollRef}
      className="sheet-score w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
      aria-hidden
    >
      <div ref={staffRef} style={{ minHeight: Math.round(SYSTEM_HEIGHT * SCALE) }} />
    </div>
  );
}
