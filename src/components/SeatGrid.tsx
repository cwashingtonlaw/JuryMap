import SeatCard from './SeatCard';
import type { Juror } from '../types/case';

interface Props {
  jurors: Juror[];
  onSeatClick?: (seat: number) => void;
}

export default function SeatGrid({ jurors, onSeatClick }: Props) {
  const bySeat = new Map<number, Juror>();
  for (const j of jurors) {
    if (j.seatIndex != null) bySeat.set(j.seatIndex, j);
  }
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 21 }).map((_, i) => {
        const seat = i + 1;
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
