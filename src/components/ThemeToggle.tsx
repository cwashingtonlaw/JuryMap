import { useTheme, type Theme } from '../hooks/useTheme';

const CYCLE: Theme[] = ['light', 'dark', 'system'];
const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABELS[theme]}. Click to cycle.`}
      className="px-2 py-1 text-xs rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
      {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}{' '}
      {LABELS[theme]}
    </button>
  );
}
