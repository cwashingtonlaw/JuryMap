import { useCallback, useEffect, useRef, useState } from 'react';

export interface DrawingCanvasProps {
  value: string; // serialized SVG path data
  onChange: (svg: string) => void;
  readOnly?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }
interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

// ── SVG serialization helpers ─────────────────────────────────────────────────

/**
 * Encode a single stroke to an SVG path `d` attribute.
 * Uses cubic Bezier smoothing for a natural ink feel.
 */
function strokeToPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { x, y } = points[0];
    return `M${x.toFixed(1)},${y.toFixed(1)} L${(x + 0.1).toFixed(1)},${y.toFixed(1)}`;
  }
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = ((prev.x + curr.x) / 2).toFixed(1);
    const cpy = ((prev.y + curr.y) / 2).toFixed(1);
    d += ` Q${prev.x.toFixed(1)},${prev.y.toFixed(1)} ${cpx},${cpy}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

/**
 * Serialize an array of strokes to a compact JSON string.
 * Format: JSON array of { d, color, width } objects.
 */
function serializeStrokes(strokes: Stroke[]): string {
  if (strokes.length === 0) return '';
  return JSON.stringify(
    strokes.map((s) => ({ d: strokeToPath(s.points), c: s.color, w: s.width }))
  );
}

/**
 * Parse serialized stroke data back into Stroke-compatible objects for SVG rendering.
 * Returns array of { d, color, width }.
 */
function parseStrokes(data: string): Array<{ d: string; c: string; w: number }> {
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ── Color / width presets ────────────────────────────────────────────────────

const COLORS = [
  { label: 'Black', value: '#1a1a1a' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Green', value: '#16a34a' },
];

const WIDTHS = [
  { label: 'Thin', value: 1.5 },
  { label: 'Medium', value: 3 },
  { label: 'Thick', value: 5 },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DrawingCanvas({
  value,
  onChange,
  readOnly = false,
  canvasWidth = 400,
  canvasHeight = 240,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    // Hydrate from value — we store rendered paths in the SVG data,
    // but for undo we need to track strokes in local state.
    // The strokes are rebuilt from value on mount.
    return [];
  });
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activeWidth, setActiveWidth] = useState(WIDTHS[1].value);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);

  // ── Canvas drawing helpers ──────────────────────────────────────────────────

  const redrawAll = useCallback(
    (strokesToDraw: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      for (const s of strokesToDraw) {
        if (s.points.length === 0) continue;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          const prev = s.points[i - 1];
          const curr = s.points[i];
          ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
        }
        ctx.stroke();
      }
    },
    [canvasWidth, canvasHeight]
  );

  // Hydrate canvas from `value` on mount / value change (e.g. after load from DB).
  // We parse the stored paths and re-render them, but undo history starts fresh.
  useEffect(() => {
    const parsed = parseStrokes(value);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const { d, c, w } of parsed) {
      const path = new Path2D(d);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    }
    // Rebuild local stroke state from parsed (without points, so undo removes whole strokes)
    setStrokes(
      parsed.map((p) => ({ points: [], color: p.c, width: p.w, _d: p.d } as any))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // ── Pointer event handlers ───────────────────────────────────────────────────

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasWidth / rect.width),
      y: (e.clientY - rect.top) * (canvasHeight / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pt = getPoint(e);
    activeStrokeRef.current = { points: [pt], color: activeColor, width: activeWidth };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pt.x, pt.y);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !activeStrokeRef.current || readOnly) return;
    const pt = getPoint(e);
    activeStrokeRef.current.points.push(pt);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const pts = activeStrokeRef.current.points;
      if (pts.length >= 2) {
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
        ctx.stroke();
      }
    }
  }

  function handlePointerUp() {
    if (!isDrawing.current || !activeStrokeRef.current) return;
    isDrawing.current = false;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (finished.points.length === 0) return;

    const next = [...strokes, finished];
    setStrokes(next);
    onChange(serializeStrokes(next));
  }

  // ── Toolbar actions ──────────────────────────────────────────────────────────

  function undo() {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    setStrokes(next);
    redrawAll(next);
    onChange(serializeStrokes(next));
  }

  function clear() {
    setStrokes([]);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, canvasWidth, canvasHeight);
    onChange('');
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Color swatches */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setActiveColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={
                  'w-5 h-5 rounded-full border-2 transition-transform ' +
                  (activeColor === c.value
                    ? 'border-slate-800 scale-125'
                    : 'border-transparent hover:scale-110')
                }
              />
            ))}
          </div>

          {/* Width selector */}
          <div className="flex items-center gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w.value}
                type="button"
                title={w.label}
                onClick={() => setActiveWidth(w.value)}
                className={
                  'flex items-center justify-center w-7 h-7 rounded border transition-colors ' +
                  (activeWidth === w.value
                    ? 'bg-slate-800 border-slate-800 text-white'
                    : 'border-[var(--border-default)] hover:border-slate-500')
                }
              >
                <div
                  style={{
                    width: 14,
                    height: w.value,
                    backgroundColor: activeWidth === w.value ? 'white' : '#334155',
                    borderRadius: w.value,
                  }}
                />
              </button>
            ))}
          </div>

          {/* Undo / Clear */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={undo}
              disabled={strokes.length === 0}
              className="text-xs px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↩ Undo
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={strokes.length === 0}
              className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        className="relative rounded-lg overflow-hidden border border-[var(--border-default)]"
        style={{ width: canvasWidth, maxWidth: '100%' }}
      >
        {/* Paper texture background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'var(--card-paper)',
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 27px, #e2e8f040 27px, #e2e8f040 28px)',
          }}
        />
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            display: 'block',
            position: 'relative',
            cursor: readOnly ? 'default' : 'crosshair',
            touchAction: 'none', // prevent scroll interference
            width: '100%',
            height: 'auto',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Hint */}
      {!readOnly && strokes.length === 0 && (
        <p className="text-[11px] text-slate-400 italic">
          Draw with your finger, stylus, or mouse
        </p>
      )}
    </div>
  );
}
