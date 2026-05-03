import type { Case } from '../types/case';
import { comparatorsFor } from '../lib/batson-analysis';
import { RACE_LABELS } from '../types/demographics';

const SHARED_LABELS: Record<string, string> = {
  priorJury: 'Prior jury',
  crimeVictim: 'Crime victim',
  leFamily: 'LE family',
  leFriend: 'LE friend',
  arrestHx: 'Arrest history',
  convictionHx: 'Conviction history',
  hardship: 'Hardship',
  employer: 'Same employer',
  jobTitle: 'Same job title',
  maritalStatus: 'Same marital status',
};

interface Props {
  activeCase: Case;
  struckJurorId: string | null;
}

export default function ComparatorList({ activeCase, struckJurorId }: Props) {
  if (!struckJurorId) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Comparators
        </h2>
        <p className="text-sm text-slate-500 italic">
          Select a struck juror from the log above to see kept jurors of a different race who share one or more characteristics.
        </p>
      </section>
    );
  }

  const struck = activeCase.panels
    .flatMap((p) => p.jurors)
    .find((j) => j.id === struckJurorId);
  if (!struck) return null;

  const comps = comparatorsFor(activeCase, struckJurorId);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Comparators for {struck.identity.name || '(unnamed)'} (
        {RACE_LABELS[struck.demographics.race]})
      </h2>
      {comps.length === 0 ? (
        <p className="text-sm text-slate-500 italic">
          No kept jurors of a different race share any of the tracked attributes
          with this juror.
        </p>
      ) : (
        <ul className="grid gap-3">
          {comps.map((c) => (
            <li
              key={c.juror.id}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {c.juror.identity.name || '(unnamed)'} ·{' '}
                    {RACE_LABELS[c.juror.demographics.race]}
                  </div>
                  <div className="text-xs text-slate-500">
                    Kept. {c.juror.employment.jobTitle ?? '—'}
                    {c.juror.employment.employer
                      ? ` at ${c.juror.employment.employer}`
                      : ''}
                  </div>
                </div>
                <div
                  className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold"
                  title={`${c.score} shared attribute${c.score === 1 ? '' : 's'}`}
                >
                  Similarity {c.score}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.sharedAttributes.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--border-subtle)] text-slate-700"
                  >
                    {SHARED_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
