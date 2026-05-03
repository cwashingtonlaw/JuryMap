import { useState } from 'react';
import type { CaseMeta } from '../types/case';

interface Props {
  meta: CaseMeta;
  onCancel: () => void;
  onConfirm: (meta: CaseMeta) => void;
  onDelete?: () => void;
}

export default function EditCaseModal({
  meta,
  onCancel,
  onConfirm,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState<CaseMeta>({ ...meta });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <header className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Edit Case</h2>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(draft)}
              className="px-4 py-1.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-all active:scale-95"
            >
              Save
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-4">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Case Info</span>
              <input
                className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Case Name"
              />
              <input
                className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                value={draft.location || ''}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Location / Venue"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Docket #</span>
                <input
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={draft.docketNumber || ''}
                  onChange={(e) => setDraft({ ...draft, docketNumber: e.target.value })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trial Date</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={draft.trialDate || ''}
                  onChange={(e) => setDraft({ ...draft, trialDate: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Peremptory Strikes</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Defense</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={draft.peremptoryBudget.defense}
                  onChange={(e) => setDraft({ 
                    ...draft, 
                    peremptoryBudget: { ...draft.peremptoryBudget, defense: parseInt(e.target.value) || 0 }
                  })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">State</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={draft.peremptoryBudget.state}
                  onChange={(e) => setDraft({ 
                    ...draft, 
                    peremptoryBudget: { ...draft.peremptoryBudget, state: parseInt(e.target.value) || 0 }
                  })}
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Seating Layout</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Seats per row</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={draft.customColumns ?? ''}
                  onChange={(e) => setDraft({ ...draft, customColumns: parseInt(e.target.value) || undefined })}
                  placeholder="Auto"
                />
                <span className="text-xs text-slate-400">
                  {(() => {
                    const vs = draft.venireSize;
                    const cols = draft.customColumns || (vs <= 6 ? 6 : vs <= 12 ? 6 : vs === 21 ? 7 : vs <= 24 ? 6 : 10);
                    const rows = Math.ceil(vs / cols);
                    return `${cols} seats/row = ${rows} row${rows !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Aisle spacers</span>
                <input
                  className="w-full rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={(draft.aisleAfterColumns ?? []).join(', ')}
                  onChange={(e) => {
                    const vals = e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim()))
                      .filter((n) => !isNaN(n) && n > 0);
                    setDraft({ ...draft, aisleAfterColumns: vals });
                  }}
                  placeholder="e.g. 3, 5"
                />
              </label>
            </div>
            <span className="text-xs text-slate-400">Custom grid width and optional aisle gaps</span>
          </section>

          {onDelete && (
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
                <h4 className="text-sm font-bold text-red-800">Danger Zone</h4>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this case? This cannot be undone.')) {
                      onDelete();
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <span className="text-lg">🗑️</span>
                  Delete Case
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
