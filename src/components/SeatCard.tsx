import type {
  Juror,
  JurorFlags,
  JurorStatus,
  StrikePriority,
} from '../types/case';
import {
  RACE_LABELS,
  GENDER_LABELS,
  MARITAL_LABELS,
} from '../types/demographics';

interface Props {
  seat: number;
  juror?: Juror;
  onClick?: () => void;
  showStrikePriority?: boolean; // Decision mode renders a ring overlay
  draggable?: boolean;          // Enable drag-to-swap (Questioning only)
  onDragStart?: (seat: number, ev: React.DragEvent) => void;
  onDragOver?: (seat: number, ev: React.DragEvent) => void;
  onDrop?: (seat: number, ev: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
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

// Short abbreviation shown as a chip when a flag is true.
const FLAG_CHIP_LABEL: Record<keyof JurorFlags, string> = {
  priorJury: 'Prior jury',
  crimeVictim: 'Victim',
  leFamily: 'LE fam',
  leFriend: 'LE frnd',
  arrestHx: 'Arrest',
  convictionHx: 'Conv',
  hardship: 'Hardship',
};

function activeFlagKeys(flags: JurorFlags): (keyof JurorFlags)[] {
  return (Object.keys(FLAG_CHIP_LABEL) as (keyof JurorFlags)[]).filter(
    (k) => flags[k].value
  );
}

export default function SeatCard({
  seat,
  juror,
  onClick,
  showStrikePriority,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: Props) {
  const badge = juror ? STATUS_BADGE[juror.status] : undefined;
  const dimmed = juror && juror.status !== 'active' && juror.status !== 'kept';
  const priorityRing =
    showStrikePriority && juror ? PRIORITY_RING[juror.strikePriority] : '';

  // Assemble the "identity line": age · race · gender · marital (where known).
  const idParts: string[] = [];
  if (juror) {
    if (juror.identity.age != null) idParts.push(`${juror.identity.age}`);
    if (juror.demographics.race !== 'unknown') {
      idParts.push(RACE_LABELS[juror.demographics.race]);
    }
    if (juror.demographics.gender !== 'unknown') {
      idParts.push(GENDER_LABELS[juror.demographics.gender]);
    }
    if (juror.demographics.maritalStatus !== 'unknown') {
      idParts.push(MARITAL_LABELS[juror.demographics.maritalStatus]);
    }
  }

  // Employment line: "Job at Employer" / "Job" / "Employer" / nothing.
  const job = juror?.employment.jobTitle?.trim() ?? '';
  const employer = juror?.employment.employer?.trim() ?? '';
  const employmentLine =
    job && employer ? `${job} at ${employer}` : job || employer;

  const flagChips = juror ? activeFlagKeys(juror.flags) : [];

  return (
    <button
      type="button"
      data-testid={`seat-${seat}`}
      onClick={onClick}
      draggable={draggable && !!juror ? true : undefined}
      onDragStart={
        draggable && juror && onDragStart
          ? (e) => onDragStart(seat, e)
          : undefined
      }
      onDragOver={
        draggable && onDragOver ? (e) => onDragOver(seat, e) : undefined
      }
      onDrop={draggable && onDrop ? (e) => onDrop(seat, e) : undefined}
      className={
        'text-left rounded-md bg-[var(--card-paper)] border border-[var(--card-rule)] ' +
        'p-2 border-l-4 h-full flex flex-col overflow-hidden ' +
        (juror ? LEAN_COLOR[juror.lean] : 'border-l-slate-200') +
        (dimmed ? ' opacity-60' : '') +
        (priorityRing ? ' ' + priorityRing : '') +
        (isDragging ? ' opacity-40' : '') +
        (isDragOver ? ' ring-2 ring-blue-500 ring-offset-1' : '') +
        (draggable && juror ? ' cursor-grab active:cursor-grabbing' : '')
      }
    >
      {/* Header row: seat number + juror number + status badge (top-right) */}
      <div className="text-[10px] text-slate-500 flex justify-between items-center shrink-0">
        <span>Seat {seat}</span>
        <div className="flex items-center gap-1">
          {juror?.identity.jurorNumber && (
            <span>#{juror.identity.jurorNumber}</span>
          )}
          {badge && (
            <span
              className={
                'ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ' +
                badge.klass
              }
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="text-sm font-medium mt-1 shrink-0 line-clamp-1">
        {juror?.identity.name || (
          <span className="text-slate-400 italic">Empty</span>
        )}
      </div>

      {/* Identity / demographics line */}
      {idParts.length > 0 && (
        <div className="text-[11px] text-slate-600 mt-0.5 shrink-0 line-clamp-1">
          {idParts.join(' · ')}
        </div>
      )}

      {/* Employment */}
      {employmentLine && (
        <div className="text-[11px] text-slate-700 mt-1 shrink-0 line-clamp-2">
          {employmentLine}
        </div>
      )}

      {/* Flag chips */}
      {flagChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 shrink-0">
          {flagChips.map((k) => (
            <span
              key={k}
              className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-amber-100 text-amber-800"
            >
              {FLAG_CHIP_LABEL[k]}
            </span>
          ))}
        </div>
      )}

      {/* Notes — take all remaining vertical space */}
      {juror?.notes && juror.notes.trim() && (
        <div className="text-[11px] text-slate-800 mt-1.5 whitespace-pre-wrap border-t border-slate-200/70 pt-1.5 flex-1 min-h-0 overflow-hidden">
          {juror.notes}
        </div>
      )}
    </button>
  );
}
