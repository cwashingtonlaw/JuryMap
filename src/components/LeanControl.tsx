import type { Lean } from '../types/case';

interface Props {
  value: Lean;
  onChange: (value: Lean) => void;
}

const VALUES: Lean[] = [-3, -2, -1, 0, 1, 2, 3];

export default function LeanControl({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 items-center">
      <span className="text-xs text-red-700 w-14">State</span>
      {VALUES.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            'h-7 w-7 rounded-full text-xs font-semibold ' +
            (value === v
              ? v < 0
                ? 'bg-red-700 text-white'
                : v > 0
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-700 text-white'
              : 'bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]')
          }
          aria-label={`Set lean to ${v}`}
        >
          {v > 0 ? `+${v}` : v}
        </button>
      ))}
      <span className="text-xs text-emerald-700 w-16 text-right">Defense</span>
    </div>
  );
}
