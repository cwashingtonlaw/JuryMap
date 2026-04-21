import type { Juror } from '../types/case';
import { analogyById } from '../content/analogies';

interface Props {
  juror: Juror;
}

// Compact summary of which analogies this juror has been walked through
// and the juror's recorded response to each checkpoint. Rendered at the
// bottom of the juror drawer.
export default function JurorAnalogySummary({ juror }: Props) {
  const analogyResponses = juror.reactions.filter(
    (r) => r.kind === 'analogy-response' && r.analogyId && r.checkpointId
  );

  if (analogyResponses.length === 0) return null;

  // Group by analogyId
  const byAnalogy = new Map<string, typeof analogyResponses>();
  for (const r of analogyResponses) {
    const key = r.analogyId!;
    const list = byAnalogy.get(key) ?? [];
    list.push(r);
    byAnalogy.set(key, list);
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Analogy responses
      </h3>
      <ul className="grid gap-3">
        {Array.from(byAnalogy.entries()).map(([analogyId, responses]) => {
          const analogy = analogyById(analogyId);
          if (!analogy) return null;

          return (
            <li
              key={analogyId}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="text-xs font-semibold text-slate-700">
                {analogy.title}
              </div>
              <ul className="mt-1.5 grid gap-1">
                {analogy.steps
                  .filter((s) => s.checkpoint)
                  .map((step) => {
                    const cp = step.checkpoint!;
                    // Use the latest response for this checkpoint if the
                    // attorney re-recorded it.
                    const matching = responses
                      .filter((r) => r.checkpointId === cp.id)
                      .sort((a, b) => a.at.localeCompare(b.at));
                    const latest = matching.at(-1);
                    if (!latest) return null;
                    const klass =
                      latest.response === 'yes'
                        ? 'bg-emerald-100 text-emerald-800'
                        : latest.response === 'no'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800';
                    return (
                      <li
                        key={cp.id}
                        className="text-[11px] text-slate-700 flex items-start gap-2"
                      >
                        <span
                          className={
                            'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ' +
                            klass
                          }
                        >
                          {latest.response}
                        </span>
                        <span className="flex-1">{cp.question}</span>
                      </li>
                    );
                  })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
