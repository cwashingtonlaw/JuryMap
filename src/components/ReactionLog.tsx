import { useState } from 'react';
import type { Juror, ReactionEntry } from '../types/case';

interface Props {
  juror: Juror;
  onRecord: (entry: ReactionEntry) => void;
}

// Freeform behavioral observations: "crossed arms during LE questioning,"
// "nodded on reasonable doubt," "looked hostile when state described victim."
// Separate from the analogy-response checkpoints — those are structured.
export default function ReactionLog({ juror, onRecord }: Props) {
  const [draft, setDraft] = useState('');

  const behaviorReactions = juror.reactions
    .filter((r) => r.kind === 'behavior')
    .sort((a, b) => a.at.localeCompare(b.at));

  function submit() {
    const note = draft.trim();
    if (!note) return;
    onRecord({
      at: new Date().toISOString(),
      kind: 'behavior',
      note,
    });
    setDraft('');
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Reactions / observations
      </h3>
      <div className="grid gap-2">
        <textarea
          rows={2}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g., 'crossed arms during burden-of-proof questioning' — Enter to record."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          className="self-end rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:bg-slate-300"
        >
          Record reaction
        </button>
      </div>

      {behaviorReactions.length > 0 && (
        <ul className="mt-3 grid gap-1.5">
          {behaviorReactions.map((r, i) => (
            <li
              key={i}
              className="text-xs text-slate-700 flex items-start gap-2"
            >
              <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                {new Date(r.at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex-1">{r.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
