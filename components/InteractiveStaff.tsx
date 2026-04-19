'use client';

import { useEffect, useState } from 'react';
import { Note, Clef, NoteStats } from '@/lib/types';
import { noteId, displayNoteName } from '@/lib/notes';

/**
 * Step distance from the bottom staff line (step 0 = line 1).
 * Lines are at even steps (0,2,4,6,8), spaces at odd steps.
 * Steps below staff: -1 (space), -2 (ledger line).
 * Steps above staff: 9 (space), 10 (ledger line).
 */
const STEPS: Record<Clef, Record<string, number>> = {
  treble: {
    'c/4': -2, 'd/4': -1,
    'e/4': 0, 'f/4': 1, 'g/4': 2, 'a/4': 3, 'b/4': 4,
    'c/5': 5, 'd/5': 6, 'e/5': 7, 'f/5': 8,
    'g/5': 9, 'a/5': 10,
  },
  bass: {
    'e/2': -2, 'f/2': -1,
    'g/2': 0, 'a/2': 1, 'b/2': 2, 'c/3': 3, 'd/3': 4,
    'e/3': 5, 'f/3': 6, 'g/3': 7, 'a/3': 8,
    'b/3': 9, 'c/4': 10,
  },
};

const LINE_SPACING = 13;   // px between staff lines in viewBox units
const NOTE_RX = 9;          // note oval horizontal radius
const NOTE_RY = 6;          // note oval vertical radius
const LEDGER_HALF_W = 13;   // half-width of ledger lines
const SVG_W = 480;          // viewBox width
const CLEF_W = 50;          // space reserved for clef symbol

const STATS_BAR_MAX_H = 65;
const STATS_BAR_GAP = 34; // gap between bar bottom and staff top line

function computeAccuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? -1 : (correct / total) * 100;
}

function barColor(a: number): string {
  if (a < 0) return '#a1a1aa';
  if (a >= 80) return '#22c55e';
  if (a >= 50) return '#eab308';
  return '#ef4444';
}

export interface InteractiveStaffProps {
  notes: Note[];
  clef: Clef;
  /** Selection mode: set of enabled note IDs */
  enabledNotes?: Set<string>;
  /** Selection mode: callback when a note is clicked */
  onToggleNote?: (id: string) => void;
  /** Stats mode: per-note statistics */
  noteStats?: Record<string, NoteStats>;
  nameSystem?: 'italian' | 'english';
}

export default function InteractiveStaff({
  notes,
  clef,
  enabledNotes,
  onToggleNote,
  noteStats,
  nameSystem = 'italian',
}: InteractiveStaffProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const showStats = !!noteStats;
  const isSelectMode = !!enabledNotes;

  // Vertical layout
  const line1Y = showStats ? 174 : 93;   // y of bottom staff line
  const line5Y = line1Y - 4 * LINE_SPACING; // y of top staff line
  const statsBaseline = line5Y - STATS_BAR_GAP;
  const svgH = line1Y + LINE_SPACING + (showStats ? 28 : 25);

  const ink = dark ? '#d4d4d8' : '#18181b';
  const dimColor = dark ? '#52525b' : '#d4d4d8';
  const labelInactive = dark ? '#71717a' : '#a1a1aa';
  const gridColor = dark ? '#3f3f46' : '#e4e4e7';
  // Deselected notes: solid fill (gray) so the whole oval is clickable
  const deselectedFill = dark ? '#52525b' : '#d4d4d8';

  // Horizontal layout
  const slotW = (SVG_W - CLEF_W - 6) / notes.length;
  const nx = (i: number) => CLEF_W + (i + 0.5) * slotW;
  const ny = (step: number) => line1Y - step * (LINE_SPACING / 2);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgH}`}
      width="100%"
      className="select-none"
      style={{ display: 'block' }}
      aria-label={`${clef === 'treble' ? 'Violino' : 'Basso'} staff`}
    >
      {/* Clef symbol */}
      <text
        x={4}
        y={clef === 'treble' ? line1Y + 16 : line5Y + 10}
        fontSize={clef === 'treble' ? 74 : 40}
        fontFamily="serif"
        fill={ink}
      >
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>

      {/* Staff lines at steps 0, 2, 4, 6, 8 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={CLEF_W - 4} y1={ny(i * 2)}
          x2={SVG_W - 4}  y2={ny(i * 2)}
          stroke={ink} strokeWidth={1}
        />
      ))}

      {/* Dashed histogram baseline */}
      {showStats && (
        <line
          x1={CLEF_W - 4} y1={statsBaseline}
          x2={SVG_W - 4}  y2={statsBaseline}
          stroke={gridColor} strokeWidth={0.75} strokeDasharray="4 3"
        />
      )}

      {/* Notes */}
      {notes.map((note, i) => {
        const id = noteId(note);
        const step = STEPS[clef][note.vexKey] ?? 0;
        const cx = nx(i);
        const cy = ny(step);

        // Selection state
        const enabled = enabledNotes ? enabledNotes.has(id) : true;
        const noteFill = isSelectMode ? (enabled ? '#4f46e5' : deselectedFill) : ink;
        const noteStroke = isSelectMode ? (enabled ? '#4f46e5' : deselectedFill) : ink;
        const labelFill = isSelectMode
          ? (enabled ? '#4f46e5' : labelInactive)
          : labelInactive;

        // Stats
        const s = noteStats?.[id];
        const a = s ? computeAccuracy(s.correct, s.wrong) : -1;
        const total = s ? s.correct + s.wrong : 0;
        const barH = a >= 0 ? (a / 100) * STATS_BAR_MAX_H : 0;

        return (
          <g
            key={id}
            onClick={() => onToggleNote?.(id)}
            style={{ cursor: onToggleNote ? 'pointer' : 'default' }}
            role={onToggleNote ? 'button' : undefined}
            aria-pressed={onToggleNote ? enabled : undefined}
            aria-label={`${displayNoteName(note.letter, nameSystem)}${note.octave}`}
          >
            {/* ── Histogram bar (stats mode) ────────────────────── */}
            {showStats && (
              a >= 0 ? (
                <>
                  <rect
                    x={cx - 10} y={statsBaseline - barH}
                    width={20} height={barH}
                    fill={barColor(a)} rx={3} opacity={0.9}
                  />
                  <text
                    x={cx} y={statsBaseline - barH - 3}
                    textAnchor="middle" fontSize={7}
                    fill={barColor(a)} fontWeight="bold"
                  >
                    {Math.round(a)}%
                  </text>
                </>
              ) : (
                <text x={cx} y={statsBaseline - 5} textAnchor="middle" fontSize={9} fill={gridColor}>
                  —
                </text>
              )
            )}

            {/* ── Ledger line below (step −2: C4 treble / E2 bass) ─ */}
            {step === -2 && (
              <line
                x1={cx - LEDGER_HALF_W} y1={ny(-2)}
                x2={cx + LEDGER_HALF_W} y2={ny(-2)}
                stroke={ink} strokeWidth={1.5}
              />
            )}

            {/* ── Ledger line above (step 10: A5 treble / C4 bass) ─ */}
            {step === 10 && (
              <line
                x1={cx - LEDGER_HALF_W} y1={ny(10)}
                x2={cx + LEDGER_HALF_W} y2={ny(10)}
                stroke={ink} strokeWidth={1.5}
              />
            )}

            {/* ── Selection glow ───────────────────────────────── */}
            {isSelectMode && enabled && (
              <ellipse
                cx={cx} cy={cy}
                rx={NOTE_RX + 4} ry={NOTE_RY + 3.5}
                fill="#4f46e5" opacity={0.13}
              />
            )}

            {/* ── Note oval ────────────────────────────────────── */}
            <ellipse
              cx={cx} cy={cy}
              rx={NOTE_RX} ry={NOTE_RY}
              fill={noteFill} stroke={noteStroke} strokeWidth={1.5}
            />

            {/* ── Note name label ──────────────────────────────── */}
            <text
              x={cx} y={line1Y + LINE_SPACING + 14}
              textAnchor="middle" fontSize={10}
              fill={labelFill}
              fontWeight={isSelectMode && enabled ? 'bold' : 'normal'}
            >
              {displayNoteName(note.letter, nameSystem)}
            </text>

            {/* ── Attempt count (stats mode) ────────────────────── */}
            {showStats && total > 0 && (
              <text
                x={cx} y={line1Y + LINE_SPACING + 25}
                textAnchor="middle" fontSize={7}
                fill={dimColor}
              >
                {total}×
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
