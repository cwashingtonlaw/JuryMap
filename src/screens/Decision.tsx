import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import type { StrikePriority } from '../types/case';
import SeatGrid from '../components/SeatGrid';
import StrikePicker, { type StrikeChoice } from '../components/StrikePicker';
import PeremptoryTracker from '../components/PeremptoryTracker';
import BatsonTallyHeader from '../components/BatsonTallyHeader';
import EditCaseModal from '../components/EditCaseModal';
import JurorCompare from '../components/JurorCompare';

import { calcCutoffSeat } from '../lib/panel';
import { serializeCase } from '../lib/juryfile';
import { saveJuryFile } from '../lib/files';
import { useFileShortcuts } from '../hooks/useFileShortcuts';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import ThemeToggle from '../components/ThemeToggle';
import PanelNav from '../components/PanelNav';
import JurorDrawer from '../components/JurorDrawer';

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
  const [viewingJurorId, setViewingJurorId] = useState<string | null>(null);
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareJurors, setCompareJurors] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Auto-save indicator
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUpdatedAt = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  useEffect(() => {
    const updatedAt = activeCase?.updatedAt;
    if (prevUpdatedAt.current && updatedAt && updatedAt !== prevUpdatedAt.current) {
      setSavedVisible(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedVisible(false), 2000);
    }
    prevUpdatedAt.current = updatedAt;
  }, [activeCase?.updatedAt]);

  const panel = activeCase?.panels[activeCase.currentPanelIndex];
  const openJuror = panel?.jurors.find((j) => j.id === openJurorId);

  async function onSave(status: StrikeChoice, reason: string) {
    if (!caseId || !openJurorId) return;

    if (status !== 'kept') {
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
            <span className={`text-xs text-green-600 transition-opacity duration-500 ${savedVisible ? 'opacity-100' : 'opacity-0'}`}>
              ● Saved
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!activeCase) return;
              const name =
                (activeCase.meta.name || 'case')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '') + '.jury';
              const text = serializeCase(activeCase, 'jury-selection-app/0.2.0');
              await saveJuryFile(name, text);
            }}
            className="text-sm text-slate-600 hover:text-slate-900 self-center mr-2"
            title="Save (Cmd+S)"
          >
            Save
          </button>
          <Link
            to={`/cases/${caseId}/batson`}
            className="text-sm text-slate-600 hover:text-slate-900 self-center mr-2"
          >
            Batson Analysis
          </Link>
          <button
            type="button"
            onClick={() => {
              setCompareMode((m) => !m);
              if (compareMode) setCompareJurors([]);
            }}
            className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
              compareMode
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
          <ThemeToggle />
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
            onClick={async () => {
              if (!caseId) return;
              await updateCase((draft) => {
                draft.mode = 'questioning';
                draft.panels[draft.currentPanelIndex].status = 'questioning';
              });
              nav(`/cases/${caseId}/questioning`);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Return to Questioning
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

      <PanelNav
        activeCase={activeCase}
        caseId={caseId!}
        currentView="decision"
        onSwitchPanel={async (idx) => {
          await updateCase((draft) => {
            draft.currentPanelIndex = idx;
          });
        }}
      />

      <BatsonTallyHeader activeCase={activeCase} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 min-h-0">
            <SeatGrid
              jurors={panel.jurors}
              venireSize={activeCase.meta.venireSize}
              layout={activeCase.meta.seatLayout}
              columns={activeCase.meta.customColumns}
              customFactors={activeCase.meta.customFactors}
              aisleAfterColumns={activeCase.meta.aisleAfterColumns}
              showStrikePriority
              cutoffSeat={calcCutoffSeat(activeCase)}
            onSeatClick={(seat) => {
              const j = panel.jurors.find((x) => x.seatIndex === seat);
              if (!j) return;
              if (compareMode) {
                setCompareJurors((prev) => {
                  if (prev.includes(j.id)) return prev.filter((id) => id !== j.id);
                  if (prev.length >= 3) return prev;
                  return [...prev, j.id];
                });
              } else {
                setViewingJurorId(j.id);
              }
            }}
          />
        </div>
        <PeremptoryTracker activeCase={activeCase} />
      </div>

      {viewingJurorId && (() => {
        const viewJuror = panel.jurors.find((j) => j.id === viewingJurorId);
        if (!viewJuror) return null;
        return (
          <JurorDrawer
            juror={viewJuror}
            factors={activeCase.meta.customFactors ?? []}
            readOnly
            onClose={() => setViewingJurorId(null)}
            onChange={() => {}}
            onDisqualify={undefined}
          >
            <button
              type="button"
              onClick={() => {
                setOpenJurorId(viewingJurorId);
                setViewingJurorId(null);
              }}
              className="w-full mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Make Strike Decision
            </button>
          </JurorDrawer>
        );
      })()}
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

      {/* Compare mode floating bar */}
      {compareMode && compareJurors.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            {compareJurors.map((id) => {
              const j = panel.jurors.find((x) => x.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900 px-3 py-1 text-xs font-medium text-indigo-800 dark:text-indigo-200"
                >
                  {j?.identity.name || 'Juror'}
                  <button
                    type="button"
                    onClick={() => setCompareJurors((prev) => prev.filter((x) => x !== id))}
                    className="ml-1 text-indigo-500 hover:text-indigo-700"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
          <span className="text-xs text-slate-400">
            {compareJurors.length}/3 selected
          </span>
          <button
            type="button"
            disabled={compareJurors.length < 2}
            onClick={() => setShowCompareModal(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500"
          >
            Compare Now
          </button>
        </div>
      )}

      {/* Compare modal */}
      {showCompareModal && (
        <JurorCompare
          jurors={panel.jurors.filter((j) => compareJurors.includes(j.id))}
          factors={activeCase.meta.customFactors ?? []}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
