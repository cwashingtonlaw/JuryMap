import { useState } from 'react';
import type { JurorStatus, StrikePriority } from '../types/case';

export type StrikeChoice =
  | 'kept'
  | 'struck-peremptory-defense'
  | 'struck-peremptory-state'
  | 'struck-cause-defense'
  | 'struck-cause-state'
  | 'excused-by-court';

interface Props {
  jurorName: string;
  currentStatus: JurorStatus;
  currentReason?: string;
  currentPriority?: StrikePriority;
  onCancel: () => void;
  onConfirm: (status: StrikeChoice, reason: string) => void;
  onPriorityChange?: (priority: StrikePriority) => void;
}

const PRIORITY_VALUES: StrikePriority[] = [0, 1, 2, 3, 4, 5];
const PRIORITY_LABELS: Record<StrikePriority, string> = {
  0: '—',
  1: '1 (maybe)',
  2: '2',
  3: '3',
  4: '4',
  5: '5 (strike first)',
};

const OPTIONS: { value: StrikeChoice; label: string; hint?: string }[] = [
  { value: 'kept', label: 'Keep', hint: 'Juror stays in the box' },
  {
    value: 'struck-peremptory-defense',
    label: 'Peremptory — Defense',
    hint: 'Counts against defense budget',
  },
  {
    value: 'struck-peremptory-state',
    label: 'Peremptory — State',
    hint: 'Counts against state budget',
  },
  {
    value: 'struck-cause-defense',
    label: 'Cause — Defense',
    hint: 'Unlimited; challenge sustained',
  },
  {
    value: 'struck-cause-state',
    label: 'Cause — State',
    hint: 'Unlimited; challenge sustained',
  },
  {
    value: 'excused-by-court',
    label: 'Excused by court',
    hint: 'Hardship, disqualification, etc.',
  },
];

export default function StrikePicker({
  jurorName,
  currentStatus,
  currentReason,
  currentPriority,
  onCancel,
  onConfirm,
  onPriorityChange,
}: Props) {
  const initial: StrikeChoice =
    currentStatus === 'active' ? 'kept' : (currentStatus as StrikeChoice);
  const [choice, setChoice] = useState<StrikeChoice>(initial);
  const [reason, setReason] = useState(currentReason ?? '');
  const [error, setError] = useState<string | null>(null);
  const priority: StrikePriority = currentPriority ?? 0;

  const reasonRequired = choice !== 'kept';

  function submit() {
    if (reasonRequired && !reason.trim()) {
      setError('A reason is required for every strike (for the record).');
      return;
    }
    onConfirm(choice, reason.trim());
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-xl p-6 w-[520px] max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">
          Decide: {jurorName || 'juror'}
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Every non-keep decision requires a written reason. The reason is
          preserved in the record for appellate review and Batson analysis.
        </p>

        {onPriorityChange && (
          <fieldset className="mb-4">
            <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Strike priority (optional, visible as ring on the seat)
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_VALUES.map((p) => {
                const selected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPriorityChange(p)}
                    className={
                      'text-xs px-2 py-1 rounded-md border ' +
                      (selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400')
                    }
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="grid gap-2 mb-4">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={
                'flex items-start gap-3 p-2 rounded-md border cursor-pointer ' +
                (choice === opt.value
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-400')
              }
            >
              <input
                type="radio"
                name="strike"
                className="mt-1"
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                {opt.hint && (
                  <div className="text-xs text-slate-500">{opt.hint}</div>
                )}
              </div>
            </label>
          ))}
        </fieldset>

        <label className="grid gap-1 mb-4">
          <span className="text-sm font-medium">
            Reason {reasonRequired ? '(required)' : '(optional)'}
          </span>
          <textarea
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              reasonRequired
                ? 'Race-neutral reason — e.g., prior jury deadlock / LE family / expressed bias.'
                : 'Optional note'
            }
          />
        </label>

        {error && (
          <div role="alert" className="text-sm text-red-700 mb-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-3 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Save decision
          </button>
        </div>
      </div>
    </div>
  );
}
