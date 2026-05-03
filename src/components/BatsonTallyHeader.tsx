import type { Case } from '../types/case';
import { batsonTally } from '../lib/batson';
import { RACE_LABELS } from '../types/demographics';

interface Props {
  activeCase: Case;
}

export default function BatsonTallyHeader({ activeCase }: Props) {
  const t = batsonTally(activeCase);

  function sideLine(side: 'defense' | 'state') {
    const races = Object.entries(t.byRace[side]).filter(([, n]) => n > 0);
    if (races.length === 0) return <span className="text-slate-500">—</span>;
    return (
      <span>
        {races
          .map(
            ([r, n]) => `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
          )
          .join(' · ')}
      </span>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-6 border-t border-[var(--border-default)] px-8 py-2 bg-[var(--bg-body)] text-xs"
      data-testid="batson-tally-header"
    >
      <div>
        <span className="font-semibold text-emerald-800">Defense: </span>
        {sideLine('defense')}
      </div>
      <div>
        <span className="font-semibold text-red-800">State: </span>
        {sideLine('state')}
      </div>
    </div>
  );
}
