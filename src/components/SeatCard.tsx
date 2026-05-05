import type {
  Juror,
  JurorFlags,
  JurorStatus,
  StrikePriority,
  CustomFactor,
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
  customFactors?: CustomFactor[];
  beyondCutoff?: boolean;         // Seat is beyond the Smart Gallery Cutoff line
  isSelected?: boolean;           // Group Question mode: seat is currently selected
  dimmed?: boolean;               // Search filter: seat is not in highlighted set
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
  customFactors = [],
  beyondCutoff,
  isSelected,
  dimmed: searchDimmed,
}: Props) {
  const badge = juror ? STATUS_BADGE[juror.status] : undefined;
  const dimmed = (juror && juror.status !== 'active' && juror.status !== 'kept') || searchDimmed;
  const cutoffDimmed = beyondCutoff && !dimmed;
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

  const factorChips = juror
    ? customFactors.filter((f) => (juror.factorScores?.[f.id] ?? 0) > 0)
    : [];

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
        (cutoffDimmed ? ' opacity-40 border-dashed' : '') +
        (priorityRing ? ' ' + priorityRing : '') +
        (isDragging ? ' opacity-40' : '') +
        (isDragOver ? ' ring-2 ring-blue-500 ring-offset-1' : '') +
        (isSelected ? ' ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : '') +
        (draggable && juror ? ' cursor-grab active:cursor-grabbing' : '')
      }
    >
      {/* Header row: seat number + juror number + ratings + status badge (top-right) */}
      <div className="text-[10px] text-slate-500 flex justify-between items-center shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] uppercase tracking-tight text-slate-400">Seat {seat}</span>
          {juror?.identity.jurorNumber && (
            <span className="text-xs font-black text-slate-900 leading-none">
              {juror.identity.jurorNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {juror?.partyRatings?.plaintiff && juror.partyRatings.plaintiff !== 'unrated' && (
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-black/60 ${
                juror.partyRatings.plaintiff === 'green' ? 'bg-green-500 text-white/90' :
                juror.partyRatings.plaintiff === 'yellow' ? 'bg-yellow-400 text-black/60' :
                juror.partyRatings.plaintiff === 'orange' ? 'bg-orange-500 text-white/90' :
                'bg-red-500 text-white/90'
              }`}
              title={`Plaintiff: ${juror.partyRatings.plaintiff}`}
            >
              P
            </div>
          )}
          {juror?.partyRatings?.defense && juror.partyRatings.defense !== 'unrated' && (
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-black/60 ${
                juror.partyRatings.defense === 'green' ? 'bg-green-500 text-white/90' :
                juror.partyRatings.defense === 'yellow' ? 'bg-yellow-400 text-black/60' :
                juror.partyRatings.defense === 'orange' ? 'bg-orange-500 text-white/90' :
                'bg-red-500 text-white/90'
              }`}
              title={`Defense: ${juror.partyRatings.defense}`}
            >
              D
            </div>
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
        <div className="text-xs text-slate-800 mt-1 shrink-0 font-medium line-clamp-1 border-t border-slate-200/50 pt-1">
          {employmentLine}
        </div>
      )}

      {/* Flag chips */}
      {flagChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 shrink-0">
          {flagChips.map((k) => (
            <span
              key={k}
              className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200"
            >
              {FLAG_CHIP_LABEL[k]}
            </span>
          ))}
        </div>
      )}

      {/* Factor chips */}
      {factorChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 shrink-0">
          {factorChips.map((f) => (
            <span
              key={f.id}
              className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-0.5"
            >
              <span className="font-bold">{f.abbr}</span>
              <span className="text-[10px]">★{juror!.factorScores[f.id]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Notes — text or ink thumbnail */}
      {juror && (juror.notesMode ?? 'text') === 'drawing' && juror.drawingData ? (
        <div className="mt-1.5 border-t border-slate-200/70 pt-1.5 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
            <span>✍</span><span>Ink</span>
          </div>
          <div className="flex-1 min-h-0 rounded overflow-hidden bg-[#fdfcf7] border border-slate-200/60">
            <svg
              viewBox="0 0 400 240"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%', display: 'block' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {(() => {
                try {
                  const strokes: Array<{ d: string; c: string; w: number }> = JSON.parse(juror.drawingData!);
                  return strokes.map((s, i) => (
                    <path
                      key={i}
                      d={s.d}
                      stroke={s.c}
                      strokeWidth={s.w}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ));
                } catch {
                  return null;
                }
              })()}
            </svg>
          </div>
        </div>
      ) : juror?.notes && juror.notes.trim() ? (
        <div className="mt-1.5 border-t border-slate-200/70 pt-1.5 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
            Notes
          </div>
          <div className="text-[11px] text-slate-800 whitespace-pre-wrap flex-1 overflow-hidden line-clamp-4">
            {juror.notes}
          </div>
        </div>
      ) : null}
    </button>
  );
}
