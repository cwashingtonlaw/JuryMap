import type { Case } from '../types/case';
import { batsonStrikeLog } from '../lib/batson-analysis';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

interface Props {
  activeCase: Case;
  selectedJurorId?: string | null;
  onSelect: (jurorId: string) => void;
}

export default function BatsonStrikeLog({
  activeCase,
  selectedJurorId,
  onSelect,
}: Props) {
  const entries = batsonStrikeLog(activeCase);
  if (entries.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Strike log
        </h2>
        <p className="text-sm text-slate-500 italic">
          No peremptory strikes recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Strike log — {entries.length} peremptor{entries.length === 1 ? 'y' : 'ies'}
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-1 pr-4 font-medium">#</th>
            <th className="text-left py-1 pr-4 font-medium">Juror</th>
            <th className="text-left py-1 pr-4 font-medium">Side</th>
            <th className="text-left py-1 pr-4 font-medium">Race</th>
            <th className="text-left py-1 pr-4 font-medium">Gender</th>
            <th className="text-left py-1 pr-4 font-medium">Panel · seat</th>
            <th className="text-left py-1 pr-4 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const selected = selectedJurorId === e.jurorId;
            return (
              <tr
                key={e.jurorId}
                onClick={() => onSelect(e.jurorId)}
                className={
                  'border-b border-[var(--border-subtle)] cursor-pointer hover:bg-slate-50 ' +
                  (selected ? 'bg-amber-50' : '')
                }
              >
                <td className="py-1 pr-4 text-slate-400">{i + 1}</td>
                <td className="py-1 pr-4 font-medium">{e.name}</td>
                <td className="py-1 pr-4">
                  <span
                    className={
                      e.side === 'defense'
                        ? 'text-emerald-800'
                        : 'text-red-800'
                    }
                  >
                    {e.side === 'defense' ? 'Defense' : 'State'}
                  </span>
                </td>
                <td className="py-1 pr-4">{RACE_LABELS[e.race]}</td>
                <td className="py-1 pr-4">{GENDER_LABELS[e.gender]}</td>
                <td className="py-1 pr-4 text-slate-500">
                  {e.panelIndex}
                  {e.seatIndex != null ? ` · ${e.seatIndex}` : ''}
                </td>
                <td className="py-1 pr-4 text-slate-700 line-clamp-1 max-w-xs">
                  {e.reason || <em className="text-slate-400">—</em>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
