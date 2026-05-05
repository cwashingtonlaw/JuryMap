import { useEffect, useState } from 'react';
import type { Juror, ReactionEntry, CustomFactor } from '../types/case';
import JurorFields from './JurorFields';
import AnalogyLibrary from './AnalogyLibrary';
import AnalogyPrompter from './AnalogyPrompter';
import JurorAnalogySummary from './JurorAnalogySummary';
import ReactionLog from './ReactionLog';

interface Props {
  juror: Juror;
  factors?: CustomFactor[];
  readOnly?: boolean;
  onClose: () => void;
  onChange: (mutator: (draft: Juror) => void) => void;
  onDisqualify?: () => void;
  children?: React.ReactNode;
}

export default function JurorDrawer({
  juror,
  factors = [],
  readOnly,
  onClose,
  onChange,
  onDisqualify,
  children,
}: Props) {
  const [analogyPickerOpen, setAnalogyPickerOpen] = useState(false);
  const [activeAnalogyId, setActiveAnalogyId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't let Escape close the drawer while a nested modal is open —
      // the nested modal has its own close affordance and handling.
      if (analogyPickerOpen || activeAnalogyId) return;
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, analogyPickerOpen, activeAnalogyId]);

  function recordReaction(entry: ReactionEntry) {
    onChange((d) => {
      d.reactions = [...(d.reactions ?? []), entry];
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex">
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="w-[420px] bg-[var(--bg-surface)] h-full overflow-y-auto shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Seat {juror.seatIndex ?? '—'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-sm"
          >
            Close (Esc)
          </button>
        </div>

        <JurorFields juror={juror} factors={factors} readOnly={readOnly} onChange={onChange} />

        {!readOnly && (
          <div className="mt-6 border-t border-[var(--border-default)] pt-4 grid gap-2">
            <button
              onClick={() => setAnalogyPickerOpen(true)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Walk through an analogy…
            </button>
          </div>
        )}

        <JurorAnalogySummary juror={juror} />

        <ReactionLog juror={juror} onRecord={recordReaction} />

        {onDisqualify && juror.seatIndex != null && (
          <div className="mt-6 border-t border-[var(--border-default)] pt-4">
            <button
              onClick={onDisqualify}
              className="text-sm text-red-700 hover:text-red-900"
            >
              Disqualify juror…
            </button>
          </div>
        )}

        {children}
      </div>

      {analogyPickerOpen && (
        <AnalogyLibrary
          onPick={(id) => {
            setAnalogyPickerOpen(false);
            setActiveAnalogyId(id);
          }}
          onClose={() => setAnalogyPickerOpen(false)}
        />
      )}
      {activeAnalogyId && (
        <AnalogyPrompter
          analogyId={activeAnalogyId}
          juror={juror}
          onRecord={recordReaction}
          onClose={() => setActiveAnalogyId(null)}
        />
      )}
    </div>
  );
}
