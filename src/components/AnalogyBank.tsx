import { useState } from 'react';
import { ANALOGIES, TOPIC_LABELS, type Analogy } from '../content/analogies';

interface Props {
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}

export default function AnalogyBank({ selectedIds, onApply, onClose }: Props) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));

  function toggle(id: string) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Group analogies by topic
  const byTopic = ANALOGIES.reduce<Record<string, Analogy[]>>((acc, a) => {
    if (!acc[a.topic]) acc[a.topic] = [];
    acc[a.topic].push(a);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-[var(--bg-surface)] rounded-lg shadow-xl w-[600px] max-h-[75vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Analogy Bank</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-slate-500 mb-4">
            Select one or more analogies to use during juror questioning. Selected analogies will be available for quick access.
          </p>

          {Object.entries(byTopic).map(([topic, analogies]) => (
            <div key={topic} className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS] ?? topic}
              </h3>
              <ul className="grid gap-2">
                {analogies.map((analogy) => (
                  <li key={analogy.id}>
                    <label className="flex items-start gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 cursor-pointer hover:border-blue-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={localSelected.has(analogy.id)}
                        onChange={() => toggle(analogy.id)}
                        className="mt-0.5 rounded"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {analogy.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {analogy.summary}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">
            {localSelected.size} analogy{localSelected.size !== 1 ? 'ies' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApply(Array.from(localSelected))}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
