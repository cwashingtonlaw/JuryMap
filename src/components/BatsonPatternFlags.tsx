import type { Case } from '../types/case';
import { batsonPatternFlags } from '../lib/batson-analysis';

export default function BatsonPatternFlags({ activeCase }: { activeCase: Case }) {
  const flags = batsonPatternFlags(activeCase);
  if (flags.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Pattern flags
        </h2>
        <p className="text-sm text-slate-500 italic">
          No pattern flags yet. Flags appear when a side&apos;s peremptories skew against one race (≥ 80% with ≥ 3 total strikes, or ≥ 3 against a protected group).
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Pattern flags
      </h2>
      <ul className="grid gap-2">
        {flags.map((f, i) => (
          <li
            key={i}
            className={
              'rounded px-3 py-2 text-sm ' +
              (f.severity === 'alert'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800')
            }
          >
            {f.severity === 'alert' ? '⚠ ' : ''}
            {f.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
