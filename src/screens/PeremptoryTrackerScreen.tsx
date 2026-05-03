import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import PeremptoryTracker from '../components/PeremptoryTracker';

export default function PeremptoryTrackerScreen() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">Peremptory Tracker</div>
        </div>
        <Link
          to={`/cases/${caseId}/decision`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Decision
        </Link>
      </header>
      <PeremptoryTracker activeCase={activeCase} variant="full" />
    </div>
  );
}
