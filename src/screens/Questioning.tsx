import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { advanceToDecision } from '../db/repository';
import SeatGrid, { defaultColumnsFor } from '../components/SeatGrid';
import JurorDrawer from '../components/JurorDrawer';
import DisqualifyModal, {
  type DisqualifyKind,
} from '../components/DisqualifyModal';
import EditCaseModal from '../components/EditCaseModal';
import {
  replaceInSeat,
  slideLeft,
  swapSeats,
  makeEmptyJuror,
} from '../lib/panel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { serializeCase } from '../lib/juryfile';
import { saveJuryFile } from '../lib/files';
import { useFileShortcuts } from '../hooks/useFileShortcuts';

export default function Questioning() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);
  const past = useCaseStore((s) => s.past);
  const future = useCaseStore((s) => s.future);
  const undo = useCaseStore((s) => s.undo);
  const redo = useCaseStore((s) => s.redo);

  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isPresenter = searchParams.get('mode') === 'presenter';

  const [openSeat, setOpenSeat] = useState<number | null>(null);
  const [disqualifying, setDisqualifying] = useState<string | null>(null);
  const [isEditingCase, setIsEditingCase] = useState(false);

  // Group Question ("Raise Your Hand") mode
  const [groupMode, setGroupMode] = useState(false);
  const [groupQuestion, setGroupQuestion] = useState('');
  const [groupSelectedSeats, setGroupSelectedSeats] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const panel = activeCase?.panels[activeCase.currentPanelIndex];
  const selectedJuror =
    openSeat != null && panel
      ? panel.jurors.find((j) => j.seatIndex === openSeat)
      : undefined;

  async function patchJuror(mutator: (draft: any) => void) {
    const jurorId = selectedJuror?.id;
    if (!jurorId) return;
    await updateCase((draft) => {
      const p = draft.panels[draft.currentPanelIndex];
      const j = p.jurors.find((x: any) => x.id === jurorId);
      if (j) mutator(j);
    });
  }

  useKeyboardShortcuts(
    {
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
      g: (e) => {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setGroupMode((prev) => {
            if (prev) {
              // Exiting group mode — clear selection
              setGroupSelectedSeats(new Set());
              setGroupQuestion('');
            }
            return !prev;
          });
        }
      },
      ArrowRight: () => {
        const max = activeCase?.meta.venireSize ?? 21;
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(max, openSeat + 1));
      },
      ArrowLeft: () => {
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - 1));
      },
      ArrowDown: () => {
        const max = activeCase?.meta.venireSize ?? 21;
        const cols = defaultColumnsFor(max);
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(max, openSeat + cols));
      },
      ArrowUp: () => {
        const max = activeCase?.meta.venireSize ?? 21;
        const cols = defaultColumnsFor(max);
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - cols));
      },
    },
    true
  );

  useKeyboardShortcuts(
    {
      '1': () => selectedJuror && patchJuror((d) => { d.lean = -3; }),
      '2': () => selectedJuror && patchJuror((d) => { d.lean = -2; }),
      '3': () => selectedJuror && patchJuror((d) => { d.lean = -1; }),
      '4': () => selectedJuror && patchJuror((d) => { d.lean = 0; }),
      '5': () => selectedJuror && patchJuror((d) => { d.lean = 1; }),
      '6': () => selectedJuror && patchJuror((d) => { d.lean = 2; }),
      '7': () => selectedJuror && patchJuror((d) => { d.lean = 3; }),
      v: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.crimeVictim.value = !d.flags.crimeVictim.value;
        }),
      l: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.leFamily.value = !d.flags.leFamily.value;
        }),
      p: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.priorJury.value = !d.flags.priorJury.value;
        }),
    },
    selectedJuror != null
  );

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

  if (!activeCase || !panel) return <div className="p-8 text-slate-500">Loading…</div>;

  // ── Presenter mode: read-only, enlarged view ──
  if (isPresenter) {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-body)]">
        <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold">{activeCase.meta.name}</h1>
            <div className="text-xs text-slate-500">
              Panel {panel.index} — Presenter View
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0 p-6">
          <SeatGrid
            jurors={panel.jurors}
            venireSize={activeCase.meta.venireSize}
            layout={activeCase.meta.seatLayout}
            customFactors={activeCase.meta.customFactors}
            aisleAfterColumns={activeCase.meta.aisleAfterColumns}
          />
        </div>
      </div>
    );
  }

  async function disqualify(kind: DisqualifyKind, reason: string) {
    const jurorId = disqualifying;
    if (!jurorId) return;
    await updateCase((draft) => {
      const idx = draft.currentPanelIndex;
      const panel = draft.panels[idx];
      const fn = kind === 'replace-in-seat' ? replaceInSeat : slideLeft;
      const result = fn(panel, jurorId, reason);
      draft.panels[idx] = result.panel;
    });
    setDisqualifying(null);
    setOpenSeat(null);
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-[var(--text-secondary)]">
            Panel {panel.index} — Questioning
          </div>
        </div>
        <div className="flex gap-3 items-center">
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
          <button
            type="button"
            title="Group Question / Raise Your Hand (Cmd+G)"
            onClick={() => {
              setGroupMode((prev) => {
                if (prev) {
                  setGroupSelectedSeats(new Set());
                  setGroupQuestion('');
                }
                return !prev;
              });
            }}
            className={
              'px-3 py-1.5 text-sm rounded-md font-medium transition-colors ' +
              (groupMode
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }
          >
            {groupMode ? 'Exit Group Mode' : 'Group Question'}
          </button>
          <Link
            to={`/cases/${caseId}/analogies`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Analogy report
          </Link>
          <button
            type="button"
            title="Open Presenter View in new window"
            onClick={() => {
              window.open(
                `/cases/${caseId}/questioning?mode=presenter`,
                '_blank',
                'width=1200,height=800'
              );
            }}
            className="px-3 py-1.5 text-sm rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Present
          </button>
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
            disabled={!canFinishQuestioning(panel, activeCase.meta.venireSize)}
            onClick={async () => {
              if (!caseId) return;
              try {
                const need = activeCase.meta.venireSize ?? 21;
                const seated = panel.jurors.filter(
                  (j: any) => j.seatIndex != null && (j.identity?.name ?? '').trim()
                );
                if (seated.length !== need) {
                  alert(`Panel must have ${need} named seats before advancing to Decision.`);
                  return;
                }

                await updateCase((draft) => {
                  draft.mode = 'decision';
                  draft.updatedAt = new Date().toISOString();
                });
                nav(`/cases/${caseId}/decision`);
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Finish Questioning → Decision
          </button>
        </div>
      </header>

      {/* Group Question ("Raise Your Hand") bar */}
      {groupMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-8 py-3 flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider whitespace-nowrap">
            Group Question
          </span>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Has anyone been the victim of a crime?"
            value={groupQuestion}
            onChange={(e) => setGroupQuestion(e.target.value)}
            className="flex-1 text-sm border border-blue-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-blue-600">
            {groupSelectedSeats.size} selected
          </span>
          <button
            type="button"
            disabled={groupSelectedSeats.size === 0 || !groupQuestion.trim()}
            onClick={async () => {
              const q = groupQuestion.trim();
              if (!q || groupSelectedSeats.size === 0) return;
              await updateCase((draft) => {
                const p = draft.panels[draft.currentPanelIndex];
                const now = new Date().toISOString();
                for (const j of p.jurors) {
                  if (j.seatIndex != null && groupSelectedSeats.has(j.seatIndex)) {
                    j.reactions.push({
                      at: now,
                      kind: 'behavior',
                      note: q,
                    });
                    j.updatedAt = now;
                  }
                }
              });
              setGroupMode(false);
              setGroupQuestion('');
              setGroupSelectedSeats(new Set());
            }}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:bg-blue-300"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setGroupMode(false);
              setGroupQuestion('');
              setGroupSelectedSeats(new Set());
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 p-4">
        <SeatGrid
          jurors={panel.jurors}
          venireSize={activeCase.meta.venireSize}
          layout={activeCase.meta.seatLayout}
          customFactors={activeCase.meta.customFactors}
          aisleAfterColumns={activeCase.meta.aisleAfterColumns}
          selectedSeats={groupMode ? groupSelectedSeats : undefined}
          onSeatClick={groupMode
            ? (s) => {
                // In group mode: toggle seat selection instead of opening drawer
                setGroupSelectedSeats((prev) => {
                  const next = new Set(prev);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  return next;
                });
              }
            : async (s) => {
                const existing = panel.jurors.find((j) => j.seatIndex === s);
                if (!existing) {
                  await updateCase((draft) => {
                    const p = draft.panels[draft.currentPanelIndex];
                    p.jurors.push(makeEmptyJuror(p.id, s));
                  });
                }
                setOpenSeat(s);
              }
          }
          onSwap={groupMode ? undefined : async (from, to) => {
            await updateCase((draft) => {
              const idx = draft.currentPanelIndex;
              const p = draft.panels[idx];
              const result = swapSeats(p, from, to);
              draft.panels[idx] = result.panel;
            });
          }}
        />
      </div>

      {selectedJuror && (
        <JurorDrawer
          juror={selectedJuror}
          factors={activeCase.meta.customFactors ?? []}
          onClose={() => setOpenSeat(null)}
          onChange={patchJuror}
          onDisqualify={() => setDisqualifying(selectedJuror.id)}
        />
      )}
      {disqualifying && selectedJuror && (
        <DisqualifyModal
          jurorName={selectedJuror.identity.name}
          onCancel={() => setDisqualifying(null)}
          onConfirm={disqualify}
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
            // We need a deleteCase function, but for now we can just archive or 
            // navigate away if we implement the actual deletion in repository.
            // For now, let's just use the repo's deleteCase if it exists.
            const { deleteCase } = await import('../db/repository');
            await deleteCase(caseId!);
            nav('/cases');
          }}
        />
      )}
    </div>
  );
}

function canFinishQuestioning(
  panel: any,
  venireSize: number
): boolean {
  const seated = panel.jurors.filter(
    (j: any) => j.seatIndex != null && (j.identity?.name ?? '').trim()
  );
  return seated.length === venireSize;
}
