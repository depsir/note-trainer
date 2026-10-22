'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersDark, usePrefersReducedMotion } from '@/lib/client';
import type { Stave, StaveNote } from 'vexflow';
import { loadVexFlow, VexFlowModule } from '@/lib/vexflow';
import { writtenMidi } from '@/lib/notes';
import { BEATS_PER_MEASURE } from '@/lib/sheet';
import { Clef, Note } from '@/lib/types';

interface SheetStaffDisplayProps {
  /** The whole piece, in reading order */
  notes: Note[];
  clef: Clef;
  /** Every note of this clef the session can ask for; the box is sized to hold them all */
  range: Note[];
  /** Index of the note being read; equals `notes.length` once the piece is finished */
  currentIndex: number;
  /** Per answered note, whether it took more than one try */
  fumbled: boolean[];
  /** Wrong tries on the note being read; drives the miss animation, so it has to keep climbing */
  wrongAttempts: number;
  /** Height the score may take, in CSS pixels; a page shows as many rows as fit in it */
  maxHeight?: number;
}

/** Everything below is in VexFlow's own units; the whole drawing is scaled up once at the end. */
const SCALE = 1.35;
/**
 * Where the staff sits on the canvas it is drawn on, and how tall that canvas is.
 * Neither is the height you see: both are just working room, and the drawing is
 * cropped to the music afterwards (see `cropToReach`). VexFlow already leaves four
 * staff spaces above a stave for what hangs over it, so `STAFF_TOP` is small.
 */
const STAFF_TOP = 10;
const CANVAS_HEIGHT = 160;
/** Breathing room left around the music once the drawing is cropped to it */
const VERTICAL_PADDING = 6;
/** How far the bar number reaches above the baseline VexFlow writes it on */
const MEASURE_NUMBER_ASCENT = 10;
/**
 * Height held open until the first drawing lands, so the page does not jump.
 * A shade over what either clef asks for at its widest range, so the card only ever settles inwards.
 */
const PLACEHOLDER_HEIGHT = 175;
const NOTE_WIDTH = 46;
const MEASURE_WIDTH = NOTE_WIDTH * BEATS_PER_MEASURE;
/** Extra room the first bar needs for the clef and the time signature */
const FIRST_MEASURE_EXTRA = 70;
const EDGE_PADDING = 10;

/**
 * Once this many bars fit across, the piece is written as a page — rows one under the
 * other, read ahead like real music — instead of one line sliding past. A phone fits one
 * bar at most, so it keeps the sliding line.
 */
const MIN_BARS_PER_ROW = 3;
/** Room between one row's lowest reach and the next row's highest */
const ROW_GAP = 12;
/** Rows on show at once when no height is given; a longer page scrolls itself down as it is read */
const VISIBLE_ROWS = 3;

/**
 * Where the note being read comes to rest in the viewport, as a fraction of its width.
 * Left of centre on purpose: what is still to be played deserves more room than what is done.
 */
const READING_POSITION = 0.34;

const NOTE_STATE_CLASSES = ['is-pending', 'is-current', 'is-wrong', 'is-done', 'is-fumbled'];

/**
 * How far up and down the writing reaches, in VexFlow units.
 *
 * Asking the SVG is no good here: VexFlow 5 draws its glyphs as text in a music font,
 * and `getBBox` on a `<text>` reports the font's whole line box rather than the ink in
 * it — half again as tall as the staff, for a notehead. So the span is collected from
 * the objects instead, each of which knows where it ends up.
 */
class Reach {
  top = Infinity;
  bottom = -Infinity;

  add(top: number, bottom: number) {
    this.top = Math.min(this.top, top);
    this.bottom = Math.max(this.bottom, bottom);
  }

  /** A note reaches from the top of its stem or head to the bottom of whichever is lower. */
  addNote(note: StaveNote) {
    const head = note.getNoteHeadBounds();
    const stem = note.getStemExtents();
    this.add(Math.min(head.yTop, stem.topY, stem.baseY), Math.max(head.yBottom, stem.topY, stem.baseY));
  }
}

/**
 * How much room this clef needs, whatever the piece turns out to be.
 *
 * Measuring the notes a piece happens to have drawn would let the box breathe between
 * pieces — one that stayed low would sit in a shorter card than the next. So what gets
 * measured is the staff itself plus the highest and the lowest note the clef can ever
 * ask for in this session, formatted onto a stave of their own and never drawn. Every
 * piece in a clef then gets the same box, and the box never moves while the piece is being read.
 */
function measureStaff(stave: Stave, clef: Clef, range: Note[], vexflow: VexFlowModule): Reach {
  const { Formatter, StaveNote, Voice } = vexflow;
  const reach = new Reach();

  reach.add(stave.getTopLineTopY(), stave.getBottomLineBottomY());
  // The bar number is written above the lines, and the clef hangs past them both ways.
  reach.add(stave.getYForTopText(0) - MEASURE_NUMBER_ASCENT, stave.getBottomLineBottomY());
  for (const modifier of stave.getModifiers()) {
    const box = modifier.getBoundingBox();
    // Barlines and the time signature stay within the lines and report nothing.
    if (box.getH() > 0) reach.add(box.getY(), box.getY() + box.getH());
  }

  const pitches = range.map(writtenMidi);
  const extremes = [range[pitches.indexOf(Math.min(...pitches))], range[pitches.indexOf(Math.max(...pitches))]];
  const gauge = extremes.map((note) => new StaveNote({ keys: [note.vexKey], duration: 'q', clef }));

  // Being put on the stave is what gives a note its height, and the height is all these
  // two are here for; formatting then fills in the stem the height is measured against.
  gauge.forEach((note) => note.setStave(stave));
  const voice = new Voice({ numBeats: gauge.length, beatValue: 4 }).setStrict(false);
  voice.setContext(stave.checkContext()).setStave(stave).addTickables(gauge);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  gauge.forEach((note) => reach.addNote(note));

  return reach;
}

/**
 * Crops the drawing to the music, leaving an even margin above and below it.
 *
 * What a piece needs above and below the staff depends on what it drew — how high and
 * low its notes sit, how far the clef hangs past the lines — so the canvas is drawn
 * deliberately too tall and trimmed to fit. VexFlow scales by view box and the notes
 * keep their own coordinates, so sliding the view box onto the music and shrinking the
 * element to match costs nothing: neither the drawing nor the sideways scroll moves.
 *
 * A page of several rows keeps the same margin above its first row and below its last.
 *
 * Returns the cropped height in CSS pixels.
 */
function cropToReach(svg: SVGSVGElement, reach: Reach, width: number, rows: number, pitch: number): number {
  const top = reach.top - VERTICAL_PADDING;
  const height = reach.bottom - reach.top + (rows - 1) * pitch + VERTICAL_PADDING * 2;
  const pixels = Math.round(height * SCALE);

  svg.setAttribute('viewBox', `0 ${top} ${width} ${height}`);
  svg.setAttribute('height', String(pixels));
  svg.style.height = `${pixels}px`;
  return pixels;
}

/** How many bars fit across this many CSS pixels, with the clef and time signature in front. */
function barsAcross(pixels: number): number {
  return Math.floor((pixels / SCALE - EDGE_PADDING * 2 - FIRST_MEASURE_EXTRA) / MEASURE_WIDTH);
}

/**
 * The piece as one long staff that scrolls itself as it is read — or, with room for it,
 * as a page of rows that scrolls down a row at a time.
 *
 * It is drawn once per piece and then only recoloured: a redraw would wipe the SVG and
 * with it the scroll position, which is the one thing that has to stay continuous here.
 * Note state therefore rides on CSS classes (see `globals.css`), which outrank the
 * presentation attributes VexFlow writes onto its own paths.
 */
export default function SheetStaffDisplay({ notes, clef, range, currentIndex, fumbled, wrongAttempts, maxHeight }: SheetStaffDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const noteElementsRef = useRef<SVGElement[]>([]);
  const [drawnAt, setDrawnAt] = useState(0);
  const [height, setHeight] = useState(PLACEHOLDER_HEIGHT);
  /** Height of one row of the page, in CSS pixels; 0 while the piece is a single line */
  const [rowPixels, setRowPixels] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  const isDark = usePrefersDark();
  const reducedMotion = usePrefersReducedMotion();

  const measureCount = Math.ceil(notes.length / BEATS_PER_MEASURE);
  const across = barsAcross(boxWidth);
  /** Bars per row of the page, or 0 for the single sliding line */
  const perRow = across >= MIN_BARS_PER_ROW ? Math.min(across, measureCount) : 0;
  const measured = boxWidth > 0;
  // Only a page is drawn to the width it has; a line is redrawn only when that changes.
  const pageWidth = perRow > 0 ? boxWidth : 0;

  // A whole number of rows and their margin, so that scrolled to the end the last ones sit flush too.
  const rowsHeight = (rows: number) => rowPixels * rows + (VERTICAL_PADDING * 2 - ROW_GAP) * SCALE;
  const visibleRows =
    maxHeight === undefined || rowPixels === 0
      ? VISIBLE_ROWS
      : Math.max(1, Math.floor((maxHeight - rowsHeight(0)) / rowPixels));

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = staffRef.current;
    // Until the box has been measured there is no telling a line from a page.
    if (!element || !measured) return;

    let cancelled = false;
    noteElementsRef.current = [];

    void loadVexFlow().then((vexflow) => {
      const { Barline, Formatter, Renderer, Stave, StaveNote, Voice } = vexflow;
      if (cancelled || !staffRef.current) return;

      const container = staffRef.current;
      container.innerHTML = '';

      const measures = measureCount;
      const wrap = perRow > 0;
      const rows = wrap ? Math.ceil(measures / perRow) : 1;
      const barsPerRow = wrap ? perRow : measures;
      // A page stretches its bars to fill the width it has; a line keeps them at their natural size.
      const measureWidth = wrap ? (pageWidth / SCALE - EDGE_PADDING * 2 - FIRST_MEASURE_EXTRA) / perRow : MEASURE_WIDTH;
      const totalWidth = EDGE_PADDING * 2 + FIRST_MEASURE_EXTRA + measureWidth * barsPerRow;

      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(Math.round(totalWidth * SCALE), Math.round(CANVAS_HEIGHT * rows * SCALE));

      const context = renderer.getContext();
      context.scale(SCALE, SCALE);

      const ink = isDark ? '#d4d4d8' : '#18181b';
      context.setFillStyle(ink);
      context.setStrokeStyle(ink);
      context.setLineWidth(1.2);

      const drawn: SVGElement[] = [];
      let extent: Reach | null = null;
      let pitch = 0;
      let x = EDGE_PADDING;

      for (let measure = 0; measure < measures; measure++) {
        const isFirst = measure === 0;
        const rowStart = measure % barsPerRow === 0;
        const row = Math.floor(measure / barsPerRow);
        if (rowStart) x = EDGE_PADDING;
        // Every row starts with the clef, so they all share the first bar's extra width
        // and the barlines line up from one row to the next.
        const width = measureWidth + (rowStart ? FIRST_MEASURE_EXTRA : 0);
        const stave = new Stave(x, STAFF_TOP + row * pitch, width);

        if (rowStart) {
          stave.addClef(clef);
          if (isFirst) stave.addTimeSignature(`${BEATS_PER_MEASURE}/4`);
        } else {
          // Every bar but the first of a row already has the previous bar's line to its left.
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

        // Every bar sits at the same height, so the first settles the box for all of them.
        // It has to be measured once drawn: until then the clef does not know where it is.
        if (isFirst) {
          extent = measureStaff(stave, clef, range, vexflow);
          pitch = extent.bottom - extent.top + ROW_GAP;
        }

        staveNotes.forEach((staveNote) => {
          const group = staveNote.getSVGElement();
          if (!group) return;
          group.classList.add('sheet-note');
          drawn.push(group);
        });

        x += width;
      }

      noteElementsRef.current = drawn;
      const svg = container.querySelector('svg');
      if (svg && extent) setHeight(cropToReach(svg, extent, totalWidth, rows, pitch));
      setRowPixels(wrap ? pitch * SCALE : 0);
      // Colouring and scrolling both hang off the elements this pass produced.
      setDrawnAt((count) => count + 1);
    });

    return () => {
      cancelled = true;
      noteElementsRef.current = [];
      element.innerHTML = '';
    };
  }, [notes, clef, range, isDark, measured, measureCount, perRow, pageWidth]);

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

    const behavior = reducedMotion ? 'auto' : 'smooth';
    if (rowPixels > 0) {
      // A page brings the row being read to the top, leaving the rows after it in view.
      const row = Math.floor(currentIndex / (perRow * BEATS_PER_MEASURE));
      scroller.scrollTo({ top: row * rowPixels, behavior });
      return;
    }

    const noteBox = target.getBoundingClientRect();
    const viewBox = scroller.getBoundingClientRect();
    const offset = noteBox.left + noteBox.width / 2 - viewBox.left - viewBox.width * READING_POSITION;
    scroller.scrollTo({ left: scroller.scrollLeft + offset, behavior });
  }, [currentIndex, drawnAt, reducedMotion, rowPixels, perRow]);

  return (
    <div
      ref={scrollRef}
      className={[
        'sheet-score w-full',
        rowPixels > 0 ? 'overflow-y-auto overflow-x-hidden overscroll-y-contain' : 'overflow-x-auto overflow-y-hidden overscroll-x-contain',
      ].join(' ')}
      style={rowPixels > 0 ? { maxHeight: Math.min(height, rowsHeight(visibleRows)) } : undefined}
      aria-hidden
    >
      <div ref={staffRef} style={{ height }} />
    </div>
  );
}
