import type { JurorFlags } from '../types/case';

interface Props {
  flags: JurorFlags;
  onToggle: (key: keyof JurorFlags) => void;
}

const FLAG_LABELS: Record<keyof JurorFlags, string> = {
  priorJury: 'Prior jury',
  crimeVictim: 'Crime victim',
  leFamily: 'LE family',
  leFriend: 'LE friend',
  arrestHx: 'Arrest hx',
  convictionHx: 'Conviction hx',
  hardship: 'Hardship',
};

export default function FlagChips({ flags, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(FLAG_LABELS) as Array<keyof JurorFlags>).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onToggle(k)}
          className={
            'text-xs px-2 py-1 rounded-full border ' +
            (flags[k].value
              ? 'bg-amber-100 border-amber-400 text-amber-800'
              : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)]')
          }
        >
          {flags[k].value ? '✓ ' : ''}
          {FLAG_LABELS[k]}
        </button>
      ))}
    </div>
  );
}
