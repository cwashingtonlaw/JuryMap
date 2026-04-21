import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { ANALOGIES, analogyById } from '../content/analogies';
import type { Juror } from '../types/case';

// Cross-juror matrix of analogy responses for the whole case.
// Columns = each analogy's checkpoints (flattened). Rows = jurors.
// Cells = latest recorded response (yes / no / hesitant) or blank.
export default function AnalogyReport() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  // Flatten all jurors across panels, only those with a seat (active in the box) or kept / struck.
  const jurors: Juror[] = activeCase.panels.flatMap((p) => p.jurors);

  // Filter to analogies actually used on any juror, to keep the table narrow.
  const usedAnalogyIds = new Set<string>();
  for (const j of jurors) {
    for (const r of j.reactions) {
      if (r.kind === 'analogy-response' && r.analogyId) {
        usedAnalogyIds.add(r.analogyId);
      }
    }
  }
  const usedAnalogies = ANALOGIES.filter((a) => usedAnalogyIds.has(a.id));

  if (usedAnalogies.length === 0) {
    return (
      <div className="min-h-full">
        <Header caseName={activeCase.meta.name} caseId={caseId!} />
        <div className="p-8 text-sm text-slate-500 italic">
          No analogy responses recorded yet. Open a juror, tap &ldquo;Walk through
          an analogy…&rdquo;, and record spotter checkpoints to populate this
          report.
        </div>
      </div>
    );
  }

  // For each used analogy, enumerate its checkpoints so cells align.
  const analogyColumns = usedAnalogies.map((a) => ({
    analogy: a,
    checkpoints: a.steps.filter((s) => s.checkpoint).map((s) => s.checkpoint!),
  }));

  function latestResponse(
    juror: Juror,
    analogyId: string,
    checkpointId: string
  ): 'yes' | 'no' | 'hesitant' | undefined {
    const matches = juror.reactions
      .filter(
        (r) =>
          r.kind === 'analogy-response' &&
          r.analogyId === analogyId &&
          r.checkpointId === checkpointId
      )
      .sort((a, b) => a.at.localeCompare(b.at));
    return matches.at(-1)?.response;
  }

  function cellClass(r: 'yes' | 'no' | 'hesitant' | undefined): string {
    if (r === 'yes') return 'bg-emerald-100 text-emerald-800';
    if (r === 'no') return 'bg-red-100 text-red-800';
    if (r === 'hesitant') return 'bg-amber-100 text-amber-800';
    return 'text-slate-300';
  }

  return (
    <div className="min-h-full">
      <Header caseName={activeCase.meta.name} caseId={caseId!} />
      <div className="p-8 overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white text-left p-2 border-b-2 border-slate-300 font-medium">
                Juror
              </th>
              {analogyColumns.map(({ analogy, checkpoints }) =>
                checkpoints.map((cp) => (
                  <th
                    key={`${analogy.id}::${cp.id}`}
                    className="text-left p-2 border-b-2 border-slate-300 font-medium align-bottom"
                    title={cp.question}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">
                      {analogy.title}
                    </div>
                    <div className="max-w-[11ch] line-clamp-2 text-slate-700 font-normal mt-0.5">
                      {cp.question}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {jurors
              .filter((j) => j.reactions.some((r) => r.kind === 'analogy-response'))
              .map((j) => (
                <tr key={j.id}>
                  <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium">
                    {j.identity.name || '(unnamed)'}
                    <div className="text-[10px] text-slate-500">
                      Seat {j.seatIndex ?? '—'}
                    </div>
                  </td>
                  {analogyColumns.map(({ analogy, checkpoints }) =>
                    checkpoints.map((cp) => {
                      const r = latestResponse(j, analogy.id, cp.id);
                      return (
                        <td
                          key={`${j.id}::${analogy.id}::${cp.id}`}
                          className="p-1 border-b border-slate-100 align-middle text-center"
                        >
                          {r ? (
                            <span
                              className={
                                'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ' +
                                cellClass(r)
                              }
                            >
                              {r}
                            </span>
                          ) : (
                            <span className={cellClass(undefined)}>—</span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 italic mt-4">
          Only jurors with at least one recorded analogy response are shown.
          Hover a column header to see the full checkpoint question.
        </p>
      </div>
    </div>
  );
}

function Header({ caseName, caseId }: { caseName: string; caseId: string }) {
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">{caseName}</h1>
        <div className="text-xs text-slate-500">Analogy response report</div>
      </div>
      <div className="flex gap-3 items-center">
        <Link
          to={`/cases/${caseId}/questioning`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Questioning
        </Link>
      </div>
    </header>
  );
}
