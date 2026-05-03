import type { CustomFactor, FactorScore } from '../types/case';

interface Props {
  factors: CustomFactor[];
  scores: Record<string, FactorScore>;
  readOnly?: boolean;
  onChange: (factorId: string, score: FactorScore) => void;
}

const DOT_COLORS: Record<number, string> = {
  1: 'bg-sky-300',
  2: 'bg-sky-400',
  3: 'bg-amber-400',
  4: 'bg-orange-500',
  5: 'bg-red-600',
};

export default function FactorScores({ factors, scores, readOnly, onChange }: Props) {
  if (factors.length === 0) return null;

  return (
    <div className="grid gap-3">
      {factors.map((factor) => {
        const current = (scores[factor.id] ?? 0) as FactorScore;

        return (
          <div key={factor.id} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider w-16 shrink-0 truncate">
              {factor.label}
            </span>
            <div className="flex items-center gap-1.5">
              {([1, 2, 3, 4, 5] as FactorScore[]).map((n) => {
                const active = current >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    title={`${factor.label}: ${n}`}
                    onClick={() =>
                      // Clicking the already-active last dot clears to 0
                      onChange(factor.id, current === n ? 0 : n)
                    }
                    className={
                      'w-5 h-5 rounded-full border-2 transition-all ' +
                      (active
                        ? `${DOT_COLORS[n]} border-transparent`
                        : 'bg-white border-slate-300 hover:border-slate-400') +
                      (readOnly ? ' cursor-default' : ' cursor-pointer')
                    }
                  />
                );
              })}
              {current > 0 && !readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(factor.id, 0)}
                  className="ml-1 text-[10px] text-slate-400 hover:text-slate-600"
                  title="Clear score"
                >
                  ✕
                </button>
              )}
              {current > 0 && (
                <span className="text-xs text-slate-500 ml-1">{current}/5</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
