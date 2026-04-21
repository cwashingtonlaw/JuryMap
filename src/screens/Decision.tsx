import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import StrikePicker, { type StrikeChoice } from '../components/StrikePicker';
import PeremptoryTracker from '../components/PeremptoryTracker';
import BatsonTallyHeader from '../components/BatsonTallyHeader';
import {
  markJurorStrike,
  finishDecisionsForPanel,
  startNextPanel,
  getCase,
} from '../db/repository';
import { serializeCase } from '../lib/juryfile';
import { saveJuryFile } from '../lib/files';
import { useFileShortcuts } from '../hooks/useFileShortcuts';

export default function Decision() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  const nav = useNavigate();

  const [openJurorId, setOpenJurorId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const panel = activeCase?.panels[activeCase.currentPanelIndex];
  const openJuror = panel?.jurors.find((j) => j.id === openJurorId);

  async function onSave(status: StrikeChoice, reason: string) {
    if (!caseId || !openJurorId) return;
    await markJurorStrike(caseId, openJurorId, { status, reason });
    await loadCase(caseId);
    setOpenJurorId(null);
  }

  useFileShortcuts({
    onSave: async () => {
      if (!activeCase) return;
      const name =
        (activeCase.meta.name || 'case')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '.jury';
      const text = serializeCase(activeCase, 'jury-selection-app/0.2.0');
      await saveJuryFile(name, text);
    },
  });

  if (!activeCase || !panel) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Decision
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/cases/${caseId}/batson`}
            className="text-sm text-slate-600 hover:text-slate-900 self-center mr-2"
          >
            Batson Analysis
          </Link>
          <button
            type="button"
            disabled={panel.jurors.some(
              (j) => j.status === 'active' && j.seatIndex != null
            )}
            onClick={async () => {
              if (!caseId) return;
              try {
                await finishDecisionsForPanel(caseId);
                const fresh = await getCase(caseId);
                if (fresh?.mode === 'seated') {
                  nav(`/cases/${caseId}/seated`);
                }
                await loadCase(caseId);
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Finish Decisions
          </button>
          {panel.status === 'decided' && (
            <button
              type="button"
              onClick={async () => {
                if (!caseId) return;
                await startNextPanel(caseId);
                await loadCase(caseId);
                nav(`/cases/${caseId}/questioning`);
              }}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Start Next Panel
            </button>
          )}
        </div>
      </header>

      <BatsonTallyHeader activeCase={activeCase} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-8 overflow-auto">
          <SeatGrid
            jurors={panel.jurors}
            onSeatClick={(seat) => {
              const j = panel.jurors.find((x) => x.seatIndex === seat);
              if (j) setOpenJurorId(j.id);
            }}
          />
        </div>
        <PeremptoryTracker activeCase={activeCase} />
      </div>

      {openJuror && (
        <StrikePicker
          jurorName={openJuror.identity.name}
          currentStatus={openJuror.status}
          currentReason={openJuror.strikeReason}
          onCancel={() => setOpenJurorId(null)}
          onConfirm={onSave}
        />
      )}
    </div>
  );
}
