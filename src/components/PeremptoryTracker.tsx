import type { Case } from '../types/case';
import { peremptoryCounts } from '../lib/strike';
import { calcCutoffSeat } from '../lib/panel';

interface Props {
  activeCase: Case;
  variant?: 'rail' | 'full';
}

interface SideStrike {
  jurorId: string;
  name: string;
  panelIndex: number;
  seatIndex: number | null;
  reason: string;
}

function collectStrikes(c: Case): {
  defense: SideStrike[];
  state: SideStrike[];
} {
  const out = { defense: [] as SideStrike[], state: [] as SideStrike[] };
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      const entry: SideStrike = {
        jurorId: j.id,
        name: j.identity.name || '(unnamed)',
        panelIndex: panel.index,
        seatIndex: j.seatIndex,
        reason: j.strikeReason ?? '',
      };
      if (j.status === 'struck-peremptory-defense') out.defense.push(entry);
      else if (j.status === 'struck-peremptory-state') out.state.push(entry);
    }
  }
  return out;
}

export default function PeremptoryTracker({ activeCase, variant = 'rail' }: Props) {
  const strikes = collectStrikes(activeCase);
  const counts = peremptoryCounts(activeCase.panels.flatMap((p) => p.jurors));
  const { defense: dBudget, state: sBudget } = activeCase.meta.peremptoryBudget;
  const cutoff = calcCutoffSeat(activeCase);

  const rail = variant === 'rail';

  return (
    <section
      className={
        rail
          ? 'bg-[var(--bg-surface)] border-l border-[var(--border-default)] p-4 w-72 h-full overflow-y-auto text-sm'
          : 'p-8 grid grid-cols-2 gap-8'
      }
    >
      <div className="mb-3 px-2 py-1.5 rounded bg-slate-200/60 text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Gallery Cutoff
        </div>
        <div className="text-lg font-bold text-slate-800">
          Seat {cutoff}
        </div>
        <div className="text-[10px] text-slate-500">
          of {activeCase.meta.venireSize} in venire
        </div>
      </div>
      <SideColumn
        label="Defense"
        accent="text-emerald-800"
        used={counts.defense}
        budget={dBudget}
        entries={strikes.defense}
      />
      <SideColumn
        label="State"
        accent="text-red-800"
        used={counts.state}
        budget={sBudget}
        entries={strikes.state}
      />
    </section>
  );
}

function SideColumn({
  label,
  accent,
  used,
  budget,
  entries,
}: {
  label: string;
  accent: string;
  used: number;
  budget: number;
  entries: SideStrike[];
}) {
  const remaining = Math.max(0, budget - used);
  const warn = used >= Math.max(1, budget - 2);
  const full = used >= budget;

  return (
    <div className="mb-4">
      <header className="mb-2">
        <h3 className={`text-sm font-semibold ${accent}`}>{label}</h3>
        <div
          className={
            'text-xs ' +
            (full
              ? 'text-red-700 font-semibold'
              : warn
              ? 'text-amber-700 font-semibold'
              : 'text-slate-500')
          }
          data-testid={`tracker-${label.toLowerCase()}-status`}
        >
          {used} of {budget} used — {remaining} remaining
          {full && ' (MAX)'}
        </div>
      </header>
      <ul className="grid gap-1.5">
        {entries.map((e, i) => (
          <li
            key={e.jurorId}
            className="bg-[var(--bg-surface)] rounded border border-[var(--border-default)] px-2 py-1.5"
          >
            <div className="text-xs font-medium">
              {i + 1}. {e.name}
            </div>
            <div className="text-[10px] text-slate-500">
              Panel {e.panelIndex}
              {e.seatIndex != null ? ` · seat ${e.seatIndex}` : ''}
            </div>
            <div className="text-[11px] text-slate-700 mt-0.5 line-clamp-2">
              {e.reason || <em>no reason recorded</em>}
            </div>
          </li>
        ))}
        {Array.from({ length: Math.max(0, budget - entries.length) }).map(
          (_, i) => (
            <li
              key={`empty-${i}`}
              className="rounded border border-dashed border-slate-300 px-2 py-1.5 text-[10px] text-slate-400 text-center"
            >
              unused
            </li>
          )
        )}
      </ul>
    </div>
  );
}
