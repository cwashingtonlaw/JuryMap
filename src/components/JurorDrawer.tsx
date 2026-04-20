import { useEffect } from 'react';
import type { Juror } from '../types/case';
import JurorFields from './JurorFields';

interface Props {
  juror: Juror;
  readOnly?: boolean;
  onClose: () => void;
  onChange: (mutator: (draft: Juror) => void) => void;
  onDisqualify?: () => void;
}

export default function JurorDrawer({
  juror,
  readOnly,
  onClose,
  onChange,
  onDisqualify,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex">
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="w-[420px] bg-white h-full overflow-y-auto shadow-xl p-5">
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
        <JurorFields juror={juror} readOnly={readOnly} onChange={onChange} />
        {onDisqualify && juror.seatIndex != null && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <button
              onClick={onDisqualify}
              className="text-sm text-red-700 hover:text-red-900"
            >
              Disqualify juror…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
