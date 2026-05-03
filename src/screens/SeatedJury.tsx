import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { seatedJurors } from '../db/repository';
import type { Juror } from '../types/case';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function SeatedJury() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);
  const undo = useCaseStore((s) => s.undo);
  const redo = useCaseStore((s) => s.redo);
  const past = useCaseStore((s) => s.past);
  const future = useCaseStore((s) => s.future);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  useKeyboardShortcuts({
    z: (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) redo();
        else undo();
      }
    },
    Z: (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) redo();
        else undo();
      }
    },
    y: (e) => {
      if (e.metaKey || e.ctrlKey) redo();
    },
  });

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
    await updateCase((draft) => {
      const ids = [...draft.seatedJurorOrder];
      if (ids.length === 0) {
        // Initialize order if empty
        const currentKept = draft.panels.flatMap((p) =>
          p.jurors.filter((j) => j.status === 'kept').map((j) => j.id)
        );
        ids.push(...currentKept);
      }
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      draft.seatedJurorOrder = ids;
      draft.updatedAt = new Date().toISOString();
    });
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Seated Jury — {ordered.length} of {totalSeats} seats filled
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 mr-4 border-r border-[var(--border-default)] pr-4">
            <button
              title="Undo (Cmd+Z)"
              type="button"
              disabled={past.length === 0}
              onClick={() => undo()}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500"
            >
              ↩️
            </button>
            <button
              title="Redo (Cmd+Shift+Z)"
              type="button"
              disabled={future.length === 0}
              onClick={() => redo()}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500"
            >
              ↪️
            </button>
          </div>
          <Link
            to={`/cases/${caseId}/report`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Export PDF Report
          </Link>
        </div>
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
                'rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-4 cursor-move ' +
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {(activeCase.meta.customFactors ?? [])
                    .filter((f) => (j.factorScores?.[f.id] ?? 0) > 0)
                    .map((f) => (
                      <span
                        key={f.id}
                        className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-0.5"
                      >
                        <span className="font-bold">{f.abbr}</span>
                        <span className="text-[10px]">★{j.factorScores[f.id]}</span>
                      </span>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
