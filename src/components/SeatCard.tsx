import type { Juror } from '../types/case';

interface Props {
  seat: number;
  juror?: Juror;
  onClick?: () => void;
}

const LEAN_COLOR: Record<number, string> = {
  [-3]: 'border-l-red-700',
  [-2]: 'border-l-red-500',
  [-1]: 'border-l-red-300',
  0: 'border-l-slate-300',
  1: 'border-l-emerald-300',
  2: 'border-l-emerald-500',
  3: 'border-l-emerald-700',
};

export default function SeatCard({ seat, juror, onClick }: Props) {
  return (
    <button
      type="button"
      data-testid={`seat-${seat}`}
      onClick={onClick}
      className={
        'text-left rounded-md bg-[var(--card-paper)] border border-[var(--card-rule)] ' +
        'p-2 min-h-32 border-l-4 ' +
        (juror ? LEAN_COLOR[juror.lean] : 'border-l-slate-200')
      }
    >
      <div className="text-[10px] text-slate-500 flex justify-between">
        <span>Seat {seat}</span>
        {juror?.identity.jurorNumber && (
          <span>#{juror.identity.jurorNumber}</span>
        )}
      </div>
      <div className="text-sm font-medium mt-1">
        {juror?.identity.name || (
          <span className="text-slate-400 italic">Empty</span>
        )}
      </div>
      {juror?.employment.jobTitle && (
        <div className="text-xs text-slate-600 mt-1 line-clamp-1">
          {juror.employment.jobTitle}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">
        {juror?.demographics.maritalStatus &&
          juror.demographics.maritalStatus !== 'unknown' &&
          juror.demographics.maritalStatus}
      </div>
    </button>
  );
}
