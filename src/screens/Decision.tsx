import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import type { StrikePriority } from '../types/case';
import SeatGrid from '../components/SeatGrid';
import StrikePicker, { type StrikeChoice } from '../components/StrikePicker';
import PeremptoryTracker from '../components/PeremptoryTracker';
import BatsonTallyHeader from '../components/BatsonTallyHeader';
import EditCaseModal from '../components/EditCaseModal';
import {
  markJurorStrike,
  finishDecisionsForPanel,
  startNextPanel,
  getCase,
} from '../db/repository';
import { calcCutoffSeat } from '../lib/panel';
import { serializeCase } from '../lib/juryfile';
import { saveJuryFile } from '../lib/files';
import { useFileShortcuts } from '../hooks/useFileShortcuts';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function Decision() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);
  const past = useCaseStore((s) => s.past);
  const future = useCaseStore((s) => s.future);
  const undo = useCaseStore((s) => s.undo);
  const redo = useCaseStore((s) => s.redo);

  const nav = useNavigate();

  const [openJurorId, setOpenJurorId] = useState<string | null>(null);
  const [isEditingCase, setIsEditingCase] = useState(false);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const panel = activeCase?.panels[activeCase.currentPanelIndex];
  const openJuror = panel?.jurors.find((j) => j.id === openJurorId);

  async function onSave(status: StrikeChoice, reason: string) {
    if (!caseId || !openJurorId) return;

    if (status !== 'kept' && status !== 'active') {
      if (!reason.trim()) {
        alert('A reason is required for every strike or disqualification.');
        return;
      }
    }

    await updateCase((draft) => {
      const p = draft.panels[draft.currentPanelIndex];
      const j = p.jurors.find((x) => x.id === openJurorId);
      if (j) {
        j.status = status;
        j.strikeReason = reason.trim() || undefined;
        j.updatedAt = new Date().toISOString();
      }
    });
    setOpenJurorId(null);
  }

  async function onPriorityChange(priority: StrikePriority) {
    if (!openJurorId) return;
    await updateCase((draft) => {
      const p = draft.panels[draft.currentPanelIndex];
      const j = p.jurors.find((x) => x.id === openJurorId);
      if (j) {
        j.strikePriority = priority;
        j.updatedAt = new Date().toISOString();
      }
    });
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

  useKeyboardShortcuts({
    z: (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) redo();
        else undo();
      }
    },
    Z: (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey) redo();
        else undo();
      }
    },
    y: (e) => {
      if (e.metaKey || e.ctrlKey) redo();
    },
  });

  if (!activeCase || !panel) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-[var(--text-secondary)]">
            Panel {panel.index} — Decision
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 mr-4 border-r border-slate-200 pr-4">
            <button
              title="Undo (Cmd+Z)"
              type="button"
              disabled={past.length === 0}
              onClick={() => undo()}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500"
            >
              ↩️
            </button>
            <button
              title="Redo (Cmd+Shift+Z)"
              type="button"
              disabled={future.length === 0}
              onClick={() => redo()}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500"
            >
              ↪️
            </button>
          </div>
          <Link
            to={`/cases/${caseId}/batson`}
            className="text-sm text-slate-600 hover:text-slate-900 self-center mr-2"
          >
            Batson Analysis
          </Link>
          <button
            type="button"
            onClick={() => setIsEditingCase(true)}
            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
            title="Edit Case Settings"
          >
            ⚙️
          </button>
          <button
            type="button"
            disabled={panel.jurors.some(
              (j) => j.status === 'active' && j.seatIndex != null
            )}
            onClick={async () => {
              if (!caseId) return;
              try {
                await updateCase((draft) => {
                  const p = draft.panels[draft.currentPanelIndex];
                  p.status = 'decided';
                  p.decidedAt = new Date().toISOString();

                  const seated = draft.panels.flatMap((panel) =>
                    panel.jurors.filter((j) => j.status === 'kept').map((j) => j.id)
                  );
                  draft.seatedJurorOrder = seated;

                  const target = draft.meta.targetJurors + draft.meta.targetAlternates;
                  if (seated.length >= target) {
                    draft.mode = 'seated';
                  } else {
                    draft.mode = 'decision';
                  }
                });

                if (activeCase?.mode === 'seated') {
                  nav(`/cases/${caseId}/seated`);
                }
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
                await updateCase((draft) => {
                  const nextPanelIndex = draft.panels.length;
                  draft.panels.push({
                    id: Math.random().toString(36).substring(7), // simplistic ID generation for now, matching newId() style
                    index: nextPanelIndex + 1,
                    status: 'questioning',
                    jurors: [],
                    createdAt: new Date().toISOString(),
                  });
                  draft.currentPanelIndex = nextPanelIndex;
                  draft.mode = 'questioning';
                });
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
        <div className="flex-1 p-4 min-h-0">
          <SeatGrid
            jurors={panel.jurors}
            venireSize={activeCase.meta.venireSize}
            layout={activeCase.meta.seatLayout}
            customFactors={activeCase.meta.customFactors}
            aisleAfterColumns={activeCase.meta.aisleAfterColumns}
            showStrikePriority
            cutoffSeat={calcCutoffSeat(activeCase)}
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
          currentPriority={openJuror.strikePriority}
          onCancel={() => setOpenJurorId(null)}
          onConfirm={onSave}
          onPriorityChange={onPriorityChange}
        />
      )}
      {isEditingCase && (
        <EditCaseModal
          meta={activeCase.meta}
          onCancel={() => setIsEditingCase(false)}
          onConfirm={async (nextMeta) => {
            await updateCase((draft) => {
              draft.meta = nextMeta;
            });
            setIsEditingCase(false);
          }}
          onDelete={async () => {
            const { deleteCase } = await import('../db/repository');
            await deleteCase(caseId!);
            nav('/cases');
          }}
        />
      )}
    </div>
  );
}
