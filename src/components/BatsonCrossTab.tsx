import type { Case } from '../types/case';
import { batsonTally } from '../lib/batson';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

export default function BatsonCrossTab({ activeCase }: { activeCase: Case }) {
  const t = batsonTally(activeCase);
  const races = (Object.keys(RACE_LABELS) as Array<keyof typeof RACE_LABELS>).filter(
    (r) => t.byRace.defense[r] > 0 || t.byRace.state[r] > 0
  );
  const genders = (Object.keys(GENDER_LABELS) as Array<keyof typeof GENDER_LABELS>).filter(
    (g) => t.byGender.defense[g] > 0 || t.byGender.state[g] > 0
  );

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Cross-tab summary
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-1 pr-4"></th>
            <th className="text-right py-1 px-4 text-emerald-800">Defense</th>
            <th className="text-right py-1 px-4 text-red-800">State</th>
          </tr>
        </thead>
        <tbody>
          {races.map((r) => (
            <tr key={r} className="border-b border-slate-200">
              <td className="py-1 pr-4">{RACE_LABELS[r]}</td>
              <td className="text-right py-1 px-4">{t.byRace.defense[r]}</td>
              <td className="text-right py-1 px-4">{t.byRace.state[r]}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-400 font-semibold">
            <td className="py-1 pr-4">Total peremptories</td>
            <td className="text-right py-1 px-4">{t.totals.defense}</td>
            <td className="text-right py-1 px-4">{t.totals.state}</td>
          </tr>
        </tbody>
      </table>

      {genders.length > 0 && (
        <div className="mt-4 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Gender: </span>
          {genders
            .map(
              (g) =>
                `${GENDER_LABELS[g]} — Defense ${t.byGender.defense[g]} / State ${t.byGender.state[g]}`
            )
            .join(' · ')}
        </div>
      )}
    </section>
  );
}
