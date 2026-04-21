import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { reorderSeatedJurors, seatedJurors } from '../db/repository';
import type { Juror } from '../types/case';

export default function SeatedJury() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const kept = seatedJurors(activeCase);
  const orderedIds =
    activeCase.seatedJurorOrder.length === kept.length
      ? activeCase.seatedJurorOrder
      : kept.map((j) => j.id);
  const byId = new Map(kept.map((j) => [j.id, j]));
  const ordered: Juror[] = orderedIds
    .map((id) => byId.get(id))
    .filter((x): x is Juror => !!x);

  const target = activeCase.meta.targetJurors;
  const totalSeats = target + activeCase.meta.targetAlternates;

  async function reorder(from: number, to: number) {
    if (!caseId || from === to) return;
    const ids = ordered.map((j) => j.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    await reorderSeatedJurors(caseId, ids);
    await loadCase(caseId);
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Seated Jury — {ordered.length} of {totalSeats} seats filled
          </div>
        </div>
        <Link
          to={`/cases/${caseId}/report`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Export PDF Report
        </Link>
      </header>

      <ul className="p-8 grid gap-2 max-w-3xl">
        {ordered.map((j, i) => {
          const isAlt = i >= target;
          const label = isAlt ? `Alternate ${i - target + 1}` : `Juror ${i + 1}`;
          return (
            <li
              key={j.id}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom != null) reorder(dragFrom, i);
                setDragFrom(null);
              }}
              className={
                'rounded border border-slate-200 bg-white px-4 py-3 flex items-center gap-4 cursor-move ' +
                (dragFrom === i ? 'opacity-50' : '')
              }
            >
              <div className="w-24 text-xs uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{j.identity.name}</div>
                <div className="text-xs text-slate-500">
                  {j.employment.jobTitle || '—'}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
