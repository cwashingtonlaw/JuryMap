import { Link } from 'react-router-dom';
import type { Case } from '../types/case';

interface Props {
  activeCase: Case;
  caseId: string;
  currentView: 'questioning' | 'decision';
  onSwitchPanel: (panelIndex: number) => void;
}

export default function PanelNav({ activeCase, caseId, currentView, onSwitchPanel }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-[var(--bg-body)] px-8 py-2 shrink-0">
      {/* Panel tabs */}
      <div className="flex items-center gap-1 mr-4">
        <span className="text-xs font-medium text-slate-500 mr-2">Panels:</span>
        {activeCase.panels.map((panel, idx) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => onSwitchPanel(idx)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              idx === activeCase.currentPanelIndex
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Panel {panel.index}
            {panel.status === 'decided' && (
              <span className="ml-1 text-[10px] opacity-70">(decided)</span>
            )}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-[var(--border-default)]" />

      {/* Questioning ↔ Decision toggle */}
      <div className="flex items-center gap-1 ml-4">
        <span className="text-xs font-medium text-slate-500 mr-2">View:</span>
        <Link
          to={`/cases/${caseId}/questioning`}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            currentView === 'questioning'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Questioning
        </Link>
        <Link
          to={`/cases/${caseId}/decision`}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            currentView === 'decision'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Decision
        </Link>
      </div>
    </div>
  );
}
