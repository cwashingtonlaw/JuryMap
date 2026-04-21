import SeatCard from './SeatCard';
import type { Juror } from '../types/case';

interface Props {
  jurors: Juror[];
  onSeatClick?: (seat: number) => void;
  venireSize?: number;         // default 21
  layout?: 'rows' | 'snake';   // default 'rows'
  columns?: number;            // override columns (optional)
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

  return (
    <div className="grid gap-2" style={gridStyle}>
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
          />
        );
      })}
    </div>
  );
}
