import { useState } from 'react';
import SeatCard from './SeatCard';
import type { Juror } from '../types/case';

interface Props {
  jurors: Juror[];
  onSeatClick?: (seat: number) => void;
  venireSize?: number;             // default 21
  layout?: 'rows' | 'snake';       // default 'rows'
  columns?: number;                // override columns (optional)
  showStrikePriority?: boolean;    // Decision mode renders the priority ring
  onSwap?: (fromSeat: number, toSeat: number) => void; // enable drag-to-rearrange
}

function defaultColumnsFor(size: number): number {
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

  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

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
      className="grid gap-2"
      style={gridStyle}
      onDragEnd={() => {
        setDragFrom(null);
        setDragOver(null);
      }}
    >
      {seatOrder.map((seat, i) => {
        if (seat === 0) {
          return <div key={`blank-${i}`} />;
        }
        return (
          <SeatCard
            key={seat}
            seat={seat}
            juror={bySeat.get(seat)}
            onClick={onSeatClick ? () => onSeatClick(seat) : undefined}
            showStrikePriority={showStrikePriority}
            draggable={!!onSwap}
            onDragStart={onSwap ? handleDragStart : undefined}
            onDragOver={onSwap ? handleDragOver : undefined}
            onDrop={onSwap ? handleDrop : undefined}
            isDragging={dragFrom === seat}
            isDragOver={dragOver === seat}
          />
        );
      })}
    </div>
  );
}
