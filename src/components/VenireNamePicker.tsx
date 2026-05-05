import { useState } from 'react';
import type { VenireListEntry } from '../types/case';

interface Props {
  venireList: VenireListEntry[];
  onSelect: (entry: VenireListEntry) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function VenireNamePicker({ venireList, onSelect, onSkip, onClose }: Props) {
  const [filter, setFilter] = useState('');

  const available = venireList.filter((e) => !e.assigned);
  const filtered = filter.trim()
    ? available.filter((e) =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        (e.jurorNumber && e.jurorNumber.includes(filter))
      )
    : available;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-[var(--bg-surface)] rounded-lg shadow-xl w-[450px] max-h-[70vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Select Juror from Venire</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[var(--border-default)] shrink-0">
          <input
            type="text"
            autoFocus
            placeholder="Search by name or juror number…"
            className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="text-xs text-slate-500 mt-1">
            {available.length} available of {venireList.length} total
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length > 0 ? (
            <ul className="grid gap-1">
              {filtered.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm flex items-center gap-2"
                  >
                    {entry.jurorNumber && (
                      <span className="text-xs text-slate-400 font-mono w-8">
                        #{entry.jurorNumber}
                      </span>
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {entry.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400 italic text-center py-4">
              {available.length === 0
                ? 'All jurors have been assigned.'
                : 'No matches found.'}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[var(--border-default)] flex justify-between shrink-0">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Add blank juror instead
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
