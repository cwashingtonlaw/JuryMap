import { useState } from 'react';

export type DisqualifyKind = 'replace-in-seat' | 'slide-left';

interface Props {
  jurorName: string;
  onCancel: () => void;
  onConfirm: (kind: DisqualifyKind, reason: string) => void;
}

export default function DisqualifyModal({
  jurorName,
  onCancel,
  onConfirm,
}: Props) {
  const [kind, setKind] = useState<DisqualifyKind>('replace-in-seat');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!reason.trim()) {
      setError('A reason is required for the record.');
      return;
    }
    onConfirm(kind, reason.trim());
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-md shadow-xl p-6 w-[460px]">
        <h2 className="text-lg font-semibold mb-2">
          Disqualify {jurorName || 'juror'}
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Remove this juror from the panel. A written reason is required.
        </p>
        <fieldset className="grid gap-2 mb-4">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="kind"
              checked={kind === 'replace-in-seat'}
              onChange={() => setKind('replace-in-seat')}
            />
            <span>
              <strong>Replace in seat</strong> (default) — a new juror fills
              this seat.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="kind"
              checked={kind === 'slide-left'}
              onChange={() => setKind('slide-left')}
            />
            <span>
              <strong>Slide left</strong> — remaining jurors shift to close the
              gap.
            </span>
          </label>
        </fieldset>
        <label className="grid gap-1 mb-4">
          <span className="text-sm font-medium">Reason</span>
          <textarea
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Hardship / cause on face / …"
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
            className="px-3 py-2 text-sm rounded-md bg-red-700 text-white hover:bg-red-800"
          >
            Disqualify
          </button>
        </div>
      </div>
    </div>
  );
}
