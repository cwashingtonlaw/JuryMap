import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';

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
import ThemeToggle from '../components/ThemeToggle';
import PanelNav from '../components/PanelNav';
import QuestionBank from '../components/QuestionBank';
import AnalogyBank from '../components/AnalogyBank';
import VenireNamePicker from '../components/VenireNamePicker';
import VenireImportWizard from '../components/VenireImportWizard';
import type { VenireRow } from '../lib/venire-import';
import { newId } from '../lib/id';

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
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showAnalogyBank, setShowAnalogyBank] = useState(false);
  const [showVenireImport, setShowVenireImport] = useState(false);
  const [pendingSeat, setPendingSeat] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

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
            columns={activeCase.meta.customColumns}
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
            <span className={`text-xs text-green-600 transition-opacity duration-500 ${savedVisible ? 'opacity-100' : 'opacity-0'}`}>
              ● Saved
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowQuestionBank(true)}
            className="px-3 py-1.5 text-sm rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Question Bank
          </button>
          <button
            type="button"
            onClick={() => setShowAnalogyBank(true)}
            className="px-3 py-1.5 text-sm rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Analogy Bank
          </button>
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
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setShowVenireImport(true)}
            className="px-3 py-1.5 text-sm rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Import Venire
          </button>
          <button
            type="button"
            disabled={
              !(activeCase.venireList ?? []).some((e) => !e.assigned) ||
              !Array.from({ length: activeCase.meta.venireSize }, (_, i) => i + 1).some(
                (s) => !panel.jurors.find((j) => j.seatIndex === s)
              )
            }
            onClick={async () => {
              await updateCase((draft) => {
                const p = draft.panels[draft.currentPanelIndex];
                const venire = draft.venireList ?? [];
                let venireIdx = 0;
                for (let seat = 1; seat <= draft.meta.venireSize; seat++) {
                  const occupied = p.jurors.some((j: any) => j.seatIndex === seat);
                  if (occupied) continue;
                  // Find next unassigned venire entry
                  while (venireIdx < venire.length && venire[venireIdx].assigned) {
                    venireIdx++;
                  }
                  if (venireIdx >= venire.length) break;
                  const entry = venire[venireIdx];
                  const juror = makeEmptyJuror(p.id, seat);
                  juror.identity.name = entry.name;
                  if (entry.jurorNumber) juror.identity.jurorNumber = entry.jurorNumber;
                  p.jurors.push(juror);
                  entry.assigned = true;
                  venireIdx++;
                }
              });
            }}
            className="px-3 py-1.5 text-sm rounded-md font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Fill All Seats
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

      <PanelNav
        activeCase={activeCase}
        caseId={caseId!}
        currentView="questioning"
        onSwitchPanel={async (idx) => {
          await updateCase((draft) => {
            draft.currentPanelIndex = idx;
          });
        }}
      />

      {/* Search/filter jurors bar */}
      <div className="px-8 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
        <input
          type="text"
          placeholder="Search jurors by name, number, or notes…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-64 text-xs border border-[var(--border-default)] rounded px-2 py-1 bg-[var(--bg-surface)] focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

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
            columns={activeCase.meta.customColumns}
            customFactors={activeCase.meta.customFactors}
            aisleAfterColumns={activeCase.meta.aisleAfterColumns}
            selectedSeats={groupMode ? groupSelectedSeats : undefined}
            highlightedSeats={(() => {
              const q = searchFilter.trim().toLowerCase();
              if (!q) return undefined;
              const matched = new Set<number>();
              for (const j of panel.jurors) {
                if (j.seatIndex == null) continue;
                const name = (j.identity?.name ?? '').toLowerCase();
                const num = (j.identity?.jurorNumber ?? '').toLowerCase();
                const notes = (j.notes ?? '').toLowerCase();
                if (name.includes(q) || num.includes(q) || notes.includes(q)) {
                  matched.add(j.seatIndex);
                }
              }
              return matched;
            })()}
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
                  const hasVenire = (activeCase.venireList ?? []).some((e) => !e.assigned);
                  if (hasVenire) {
                    setPendingSeat(s);
                    return;
                  }
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
            const { deleteCase } = await import('../db/repository');
            await deleteCase(caseId!);
            nav('/cases');
          }}
        />
      )}
      {showQuestionBank && (
        <QuestionBank
          questions={activeCase.questionBank ?? []}
          onAdd={async (question) => {
            await updateCase((draft) => {
              if (!draft.questionBank) draft.questionBank = [];
              draft.questionBank.push({ id: newId(), question });
            });
          }}
          onRemove={async (id) => {
            await updateCase((draft) => {
              draft.questionBank = (draft.questionBank ?? []).filter((q) => q.id !== id);
            });
          }}
          onSelect={(question) => {
            if (selectedJuror) {
              patchJuror((d) => {
                if (!d.questionnaire) d.questionnaire = [];
                d.questionnaire.push({ question, answer: '' });
              });
            }
            setShowQuestionBank(false);
          }}
          onClose={() => setShowQuestionBank(false)}
        />
      )}
      {showAnalogyBank && (
        <AnalogyBank
          selectedIds={activeCase.analogyBank ?? []}
          onApply={async (ids) => {
            await updateCase((draft) => {
              draft.analogyBank = ids;
            });
            setShowAnalogyBank(false);
          }}
          onClose={() => setShowAnalogyBank(false)}
        />
      )}
      {pendingSeat != null && (
        <VenireNamePicker
          venireList={activeCase.venireList ?? []}
          onSelect={async (entry) => {
            const seat = pendingSeat;
            setPendingSeat(null);
            await updateCase((draft) => {
              const p = draft.panels[draft.currentPanelIndex];
              const juror = makeEmptyJuror(p.id, seat);
              juror.identity.name = entry.name;
              if (entry.jurorNumber) juror.identity.jurorNumber = entry.jurorNumber;
              p.jurors.push(juror);
              // Mark as assigned in venire list
              const ve = (draft.venireList ?? []).find((v) => v.id === entry.id);
              if (ve) ve.assigned = true;
            });
            setOpenSeat(seat);
          }}
          onSkip={async () => {
            const seat = pendingSeat;
            setPendingSeat(null);
            await updateCase((draft) => {
              const p = draft.panels[draft.currentPanelIndex];
              p.jurors.push(makeEmptyJuror(p.id, seat));
            });
            setOpenSeat(seat);
          }}
          onClose={() => setPendingSeat(null)}
        />
      )}
      {showVenireImport && (
        <VenireImportWizard
          onImport={async (rows: VenireRow[]) => {
            await updateCase((draft) => {
              if (!draft.venireList) draft.venireList = [];
              for (const row of rows) {
                draft.venireList.push({
                  id: newId(),
                  name: row.name,
                  jurorNumber: row.jurorNumber,
                  assigned: false,
                });
              }
            });
            setShowVenireImport(false);
          }}
          onCancel={() => setShowVenireImport(false)}
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
