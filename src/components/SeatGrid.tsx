import { useState } from 'react';
import SeatCard from './SeatCard';
import type { CustomFactor, Juror } from '../types/case';

interface Props {
  jurors: Juror[];
  onSeatClick?: (seat: number) => void;
  venireSize?: number;             // default 21
  layout?: 'rows' | 'snake';       // default 'rows'
  columns?: number;                // override columns (optional)
  showStrikePriority?: boolean;    // Decision mode renders the priority ring
  onSwap?: (fromSeat: number, toSeat: number) => void; // enable drag-to-rearrange
  customFactors?: CustomFactor[];  // Case-level factors for seat card chips
  cutoffSeat?: number;             // Smart Gallery Cutoff: seats beyond this are dimmed
  selectedSeats?: Set<number>;     // Group Question mode: seats currently selected
  aisleAfterColumns?: number[];   // Insert visual spacers after these 1-based column indices
}

export function defaultColumnsFor(size: number): number {
  if (size <= 6) return 6;
  if (size <= 12) return 6;
  if (size === 21) return 7;
  if (size <= 24) return 6;
  if (size <= 60) return 10;
  return 10;
}

export default function SeatGrid({
  jurors,
  onSeatClick,
  venireSize = 21,
  layout = 'rows',
  columns,
  showStrikePriority,
  onSwap,
  customFactors = [],
  cutoffSeat,
  selectedSeats,
  aisleAfterColumns = [],
}: Props) {
  const bySeat = new Map<number, Juror>();
  for (const j of jurors) {
    if (j.seatIndex != null) bySeat.set(j.seatIndex, j);
  }

  const cols = columns ?? defaultColumnsFor(venireSize);
  const rows = Math.ceil(venireSize / cols);

  // Build the linear order of seat numbers. For 'rows' layout it's 1..N.
  // For 'snake' it reverses every other row so the visual flow follows the
  // path the jury commissioner usually calls names in.
  const seatOrder: number[] = [];
  for (let r = 0; r < rows; r++) {
    const rowStart = r * cols + 1;
    const rowEnd = Math.min(rowStart + cols - 1, venireSize);
    const rowSeats: number[] = [];
    for (let s = rowStart; s <= rowEnd; s++) rowSeats.push(s);
    if (layout === 'snake' && r % 2 === 1) rowSeats.reverse();
    seatOrder.push(...rowSeats);
  }
  // Pad so the grid stays rectangular
  while (seatOrder.length < rows * cols) seatOrder.push(0); // 0 = placeholder

  // Build gridTemplateColumns with optional aisle spacers.
  // aisleAfterColumns contains 1-based column positions; a narrow gap column
  // is inserted after each one.
  const aisleSet = new Set(aisleAfterColumns);
  const colParts: string[] = [];
  for (let c = 1; c <= cols; c++) {
    colParts.push('minmax(0, 1fr)');
    if (aisleSet.has(c)) colParts.push('12px'); // aisle spacer
  }

  const gridStyle = {
    gridTemplateColumns: colParts.join(' '),
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDragStart(seat: number, ev: React.DragEvent) {
    setDragFrom(seat);
    // Required on some browsers for the drag to register
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', String(seat));
  }

  function handleDragOver(seat: number, ev: React.DragEvent) {
    if (dragFrom == null || dragFrom === seat) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    if (dragOver !== seat) setDragOver(seat);
  }

  function handleDrop(seat: number, ev: React.DragEvent) {
    ev.preventDefault();
    const from = dragFrom;
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === seat) return;
    if (onSwap) onSwap(from, seat);
  }

  return (
    <div
      className="grid gap-2 h-full"
      style={gridStyle}
      onDragEnd={() => {
        setDragFrom(null);
        setDragOver(null);
      }}
    >
      {seatOrder.map((seat, i) => {
        const colInRow = (i % cols) + 1; // 1-based column position
        const elements: React.ReactNode[] = [];
        if (seat === 0) {
          elements.push(<div key={`blank-${i}`} />);
        } else {
          elements.push(
            <SeatCard
              key={seat}
              seat={seat}
              juror={bySeat.get(seat)}
              onClick={onSeatClick ? () => onSeatClick(seat) : undefined}
              showStrikePriority={showStrikePriority}
              customFactors={customFactors}
              draggable={!!onSwap}
              onDragStart={onSwap ? handleDragStart : undefined}
              onDragOver={onSwap ? handleDragOver : undefined}
              onDrop={onSwap ? handleDrop : undefined}
              isDragging={dragFrom === seat}
              isDragOver={dragOver === seat}
              beyondCutoff={cutoffSeat != null && seat > cutoffSeat}
              isSelected={selectedSeats?.has(seat)}
            />
          );
        }
        // Insert aisle spacer div after this column if needed
        if (aisleSet.has(colInRow)) {
          elements.push(
            <div
              key={`aisle-${i}`}
              className="border-l border-dashed border-slate-300"
            />
          );
        }
        return elements;
      })}
    </div>
  );
}
