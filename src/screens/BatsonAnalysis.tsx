import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import BatsonCrossTab from '../components/BatsonCrossTab';
import BatsonStrikeLog from '../components/BatsonStrikeLog';
import ComparatorList from '../components/ComparatorList';
import BatsonPatternFlagsComponent from '../components/BatsonPatternFlags';
import { generateBatsonMotionHtml } from '../lib/batson-motion';

export default function BatsonAnalysis() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const [selectedJurorId, setSelectedJurorId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  function exportMotion() {
    if (!activeCase) return;
    const html = generateBatsonMotionHtml(activeCase, { movant: 'defense' });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    // Open in a new tab; user can print/save as PDF or Word from the browser.
    const win = window.open(url, '_blank', 'noopener');
    if (!win) {
      // Fallback: trigger a download
      const a = document.createElement('a');
      a.href = url;
      a.download =
        (activeCase.meta.name || 'case')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-batson-motion.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Revoke later so the new tab has time to load
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">Batson Analysis</div>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            to={`/cases/${caseId}/decision`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Decision
          </Link>
          <button
            type="button"
            onClick={exportMotion}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Export Motion Draft
          </button>
        </div>
      </header>

      <div className="p-8 max-w-4xl">
        <BatsonPatternFlagsComponent activeCase={activeCase} />
        <BatsonCrossTab activeCase={activeCase} />
        <BatsonStrikeLog
          activeCase={activeCase}
          selectedJurorId={selectedJurorId}
          onSelect={setSelectedJurorId}
        />
        <ComparatorList
          activeCase={activeCase}
          struckJurorId={selectedJurorId}
        />
      </div>
    </div>
  );
}
