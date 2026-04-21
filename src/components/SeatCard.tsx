import type { Juror, JurorStatus, StrikePriority } from '../types/case';

interface Props {
  seat: number;
  juror?: Juror;
  onClick?: () => void;
  showStrikePriority?: boolean; // Decision mode renders a ring overlay
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

const STATUS_BADGE: Partial<Record<JurorStatus, { label: string; klass: string }>> = {
  kept: { label: 'KEEP', klass: 'bg-emerald-100 text-emerald-800' },
  'struck-peremptory-defense': {
    label: 'PEREMPT — D',
    klass: 'bg-red-100 text-red-800',
  },
  'struck-peremptory-state': {
    label: 'PEREMPT — S',
    klass: 'bg-red-100 text-red-800',
  },
  'struck-cause-defense': {
    label: 'CAUSE — D',
    klass: 'bg-amber-100 text-amber-800',
  },
  'struck-cause-state': {
    label: 'CAUSE — S',
    klass: 'bg-amber-100 text-amber-800',
  },
  'excused-by-court': {
    label: 'EXCUSED',
    klass: 'bg-slate-200 text-slate-700',
  },
  disqualified: {
    label: 'DISQ',
    klass: 'bg-slate-200 text-slate-700',
  },
};

// Outer ring color indicates strike-first priority during Decision mode.
// 0 = no ring. 1 = amber (maybe strike). 5 = red-700 (strike immediately).
const PRIORITY_RING: Record<StrikePriority, string> = {
  0: '',
  1: 'ring-2 ring-amber-300',
  2: 'ring-2 ring-amber-500',
  3: 'ring-2 ring-orange-500',
  4: 'ring-4 ring-red-500',
  5: 'ring-4 ring-red-700',
};

export default function SeatCard({
  seat,
  juror,
  onClick,
  showStrikePriority,
}: Props) {
  const badge = juror ? STATUS_BADGE[juror.status] : undefined;
  const dimmed = juror && juror.status !== 'active' && juror.status !== 'kept';
  const priorityRing =
    showStrikePriority && juror ? PRIORITY_RING[juror.strikePriority] : '';

  return (
    <button
      type="button"
      data-testid={`seat-${seat}`}
      onClick={onClick}
      className={
        'text-left rounded-md bg-[var(--card-paper)] border border-[var(--card-rule)] ' +
        'p-2 min-h-32 border-l-4 ' +
        (juror ? LEAN_COLOR[juror.lean] : 'border-l-slate-200') +
        (dimmed ? ' opacity-60' : '') +
        (priorityRing ? ' ' + priorityRing : '')
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
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 flex gap-1 items-center">
        {juror?.demographics.maritalStatus &&
          juror.demographics.maritalStatus !== 'unknown' &&
          juror.demographics.maritalStatus}
        {badge && (
          <span
            className={
              'ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold ' +
              badge.klass
            }
          >
            {badge.label}
          </span>
        )}
      </div>
    </button>
  );
}
