import { useState } from 'react';
import { analogyById } from '../content/analogies';
import type { AnalogyResponse, Juror, ReactionEntry } from '../types/case';

interface Props {
  analogyId: string;
  juror: Juror;
  onRecord: (entry: ReactionEntry) => void;
  onClose: () => void;
}

export default function AnalogyPrompter({
  analogyId,
  juror,
  onRecord,
  onClose,
}: Props) {
  const analogy = analogyById(analogyId);
  const [stepIndex, setStepIndex] = useState(0);

  if (!analogy) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
        <div className="bg-[var(--bg-surface)] rounded-md shadow-xl p-6 w-[480px]">
          <p className="text-sm text-red-700">
            Unknown analogy id: {analogyId}
          </p>
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-md bg-slate-900 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = analogy.steps[stepIndex];
  const isLast = stepIndex === analogy.steps.length - 1;

  // Pre-existing response for this checkpoint (if any) so the spotter can see
  // if they already recorded something for this juror on this analogy.
  const existing = step.checkpoint
    ? juror.reactions.find(
        (r) =>
          r.kind === 'analogy-response' &&
          r.analogyId === analogy.id &&
          r.checkpointId === step.checkpoint!.id
      )
    : undefined;

  function recordResponse(response: AnalogyResponse) {
    if (!step.checkpoint) return;
    const entry: ReactionEntry = {
      at: new Date().toISOString(),
      kind: 'analogy-response',
      analogyId: analogy!.id,
      checkpointId: step.checkpoint.id,
      response,
      note: `${analogy!.title}: ${step.checkpoint.question}`,
    };
    onRecord(entry);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-md shadow-xl w-[720px] max-h-[85vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {analogy.title}
            </div>
            <h2 className="text-base font-semibold mt-0.5">
              Juror: {juror.identity.name || '(unnamed)'}
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            Step {stepIndex + 1} / {analogy.steps.length}
          </div>
        </header>

        <div className="px-6 py-6">
          <p className="text-lg leading-relaxed text-slate-900 whitespace-pre-wrap">
            {step.attorney_prompt}
          </p>
          {step.coaching && (
            <p className="text-xs text-slate-500 italic mt-3">
              {step.coaching}
            </p>
          )}

          {step.checkpoint && (
            <div className="mt-6 border-t border-[var(--border-default)] pt-4">
              <div className="text-sm font-medium mb-2">
                Spotter: {step.checkpoint.question}
              </div>
              <div className="flex gap-2">
                {step.checkpoint.options.map((opt) => {
                  const selected = existing?.response === opt;
                  const klass =
                    opt === 'yes'
                      ? 'border-emerald-600 text-emerald-800'
                      : opt === 'no'
                        ? 'border-red-600 text-red-800'
                        : 'border-amber-600 text-amber-800';
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => recordResponse(opt)}
                      className={
                        'rounded-md border px-4 py-2 text-sm font-medium ' +
                        klass +
                        ' ' +
                        (selected ? 'bg-slate-100' : 'bg-[var(--bg-surface)] hover:bg-slate-50')
                      }
                    >
                      {selected ? '✓ ' : ''}
                      {opt[0].toUpperCase() + opt.slice(1)}
                    </button>
                  );
                })}
              </div>
              {existing && (
                <div className="text-xs text-slate-500 mt-2">
                  Recorded {new Date(existing.at).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-body)]">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="text-sm text-slate-600 hover:text-slate-900 disabled:text-slate-300"
          >
            ← Previous
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Close
          </button>
          {isLast ? (
            <button
              onClick={onClose}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Next →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
