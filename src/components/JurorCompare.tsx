import type { Juror, CustomFactor } from '../types/case';

interface Props {
  jurors: Juror[];
  factors: CustomFactor[];
  onClose: () => void;
}

const FLAG_LABELS: Record<string, string> = {
  priorJury: 'Prior Jury',
  crimeVictim: 'Crime Victim',
  leFamily: 'LE Family',
  leFriend: 'LE Friend',
  arrestHx: 'Arrest Hx',
  convictionHx: 'Conviction Hx',
  hardship: 'Hardship',
};

function leanColor(lean: number): string {
  if (lean === 0) return 'bg-gray-200 text-gray-800';
  if (lean === 1) return 'bg-green-100 text-green-800';
  if (lean === 2) return 'bg-green-300 text-green-900';
  if (lean === 3) return 'bg-green-500 text-white';
  if (lean === -1) return 'bg-red-100 text-red-800';
  if (lean === -2) return 'bg-red-300 text-red-900';
  if (lean === -3) return 'bg-red-500 text-white';
  return 'bg-gray-200 text-gray-800';
}

function ratingColor(rating: string | undefined): string {
  if (rating === 'green') return 'text-green-600';
  if (rating === 'red') return 'text-red-600';
  if (rating === 'yellow') return 'text-yellow-600';
  if (rating === 'orange') return 'text-orange-600';
  return 'text-gray-400';
}

function priorityLabel(p: number): string {
  if (p === 0) return 'None';
  if (p === 1) return '1 - Low';
  if (p === 2) return '2';
  if (p === 3) return '3 - Medium';
  if (p === 4) return '4';
  if (p === 5) return '5 - High';
  return String(p);
}

export default function JurorCompare({ jurors, factors, onClose }: Props) {
  const gridCols = jurors.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 w-full h-full overflow-auto p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Juror Comparison
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Close
          </button>
        </div>

        {/* Columns */}
        <div className={`grid ${gridCols} gap-0 flex-1 min-h-0 overflow-auto`}>
          {jurors.map((juror, idx) => {
            const activeFlags = Object.entries(juror.flags)
              .filter(([, entry]) => entry.value)
              .map(([key]) => FLAG_LABELS[key] || key);

            const analogyReactions = juror.reactions.filter(
              (r) => r.kind === 'analogy-response'
            );

            return (
              <div
                key={juror.id}
                className={`p-4 ${idx < jurors.length - 1 ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}
              >
                {/* Name & Seat */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {juror.identity.name || 'Unnamed'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Seat #{juror.seatIndex ?? 'N/A'}
                    {juror.identity.jurorNumber && ` | Juror #${juror.identity.jurorNumber}`}
                  </p>
                </div>

                {/* Lean Score */}
                <Section title="Lean Score">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${leanColor(juror.lean)}`}
                  >
                    {juror.lean > 0 ? '+' : ''}{juror.lean}
                  </span>
                </Section>

                {/* Strike Priority */}
                <Section title="Strike Priority">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {priorityLabel(juror.strikePriority)}
                  </span>
                </Section>

                {/* Flags */}
                <Section title="Flags">
                  {activeFlags.length === 0 ? (
                    <span className="text-sm text-slate-400">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {activeFlags.map((f) => (
                        <span
                          key={f}
                          className="inline-block rounded-full bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Party Ratings */}
                <Section title="Party Ratings">
                  <div className="flex gap-4 text-sm">
                    <span>
                      Plaintiff:{' '}
                      <span className={`font-medium ${ratingColor(juror.partyRatings?.plaintiff)}`}>
                        {juror.partyRatings?.plaintiff || 'unrated'}
                      </span>
                    </span>
                    <span>
                      Defense:{' '}
                      <span className={`font-medium ${ratingColor(juror.partyRatings?.defense)}`}>
                        {juror.partyRatings?.defense || 'unrated'}
                      </span>
                    </span>
                  </div>
                </Section>

                {/* Custom Factor Scores */}
                {factors.length > 0 && (
                  <Section title="Factor Scores">
                    <div className="space-y-1">
                      {factors.map((f) => {
                        const score = juror.factorScores[f.id] || 0;
                        return (
                          <div key={f.id} className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600 dark:text-slate-400 w-20 truncate">
                              {f.abbr}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {score === 0 ? '—' : score}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Notes */}
                <Section title="Notes">
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {juror.notes
                      ? juror.notes.length > 200
                        ? juror.notes.slice(0, 200) + '...'
                        : juror.notes
                      : 'No notes'}
                  </p>
                </Section>

                {/* Questionnaire */}
                {juror.questionnaire && juror.questionnaire.length > 0 && (
                  <Section title="Questionnaire">
                    <div className="space-y-2">
                      {juror.questionnaire.map((q, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {q.question}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">{q.answer}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Analogy Responses */}
                {analogyReactions.length > 0 && (
                  <Section title="Analogy Responses">
                    <div className="space-y-1">
                      {analogyReactions.map((r, i) => (
                        <div key={i} className="text-sm flex items-center gap-2">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              r.response === 'yes'
                                ? 'bg-green-500'
                                : r.response === 'no'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                            }`}
                          />
                          <span className="text-slate-600 dark:text-slate-300 truncate">
                            {r.note || r.response || 'No response'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
        {title}
      </h4>
      {children}
    </div>
  );
}
