import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { advanceToDecision } from '../db/repository';
import SeatGrid from '../components/SeatGrid';
import JurorDrawer from '../components/JurorDrawer';
import DisqualifyModal, {
  type DisqualifyKind,
} from '../components/DisqualifyModal';
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

  const nav = useNavigate();

  const [openSeat, setOpenSeat] = useState<number | null>(null);
  const [disqualifying, setDisqualifying] = useState<string | null>(null);

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
      ArrowRight: () => {
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(21, openSeat + 1));
      },
      ArrowLeft: () => {
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - 1));
      },
      ArrowDown: () => {
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(21, openSeat + 7));
      },
      ArrowUp: () => {
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - 7));
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
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Questioning
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            to={`/cases/${caseId}/analogies`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Analogy report
          </Link>
          <button
            type="button"
            disabled={!canFinishQuestioning(panel, activeCase.meta.venireSize)}
            onClick={async () => {
              if (!caseId) return;
              try {
                await advanceToDecision(caseId);
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

      <div className="flex-1 min-h-0 p-4">
        <SeatGrid
          jurors={panel.jurors}
          venireSize={activeCase.meta.venireSize}
          layout={activeCase.meta.seatLayout}
          onSeatClick={async (s) => {
            const existing = panel.jurors.find((j) => j.seatIndex === s);
            if (!existing) {
              // Create a fresh juror at this seat so the drawer has something to edit.
              await updateCase((draft) => {
                const p = draft.panels[draft.currentPanelIndex];
                p.jurors.push(makeEmptyJuror(p.id, s));
              });
            }
            setOpenSeat(s);
          }}
          onSwap={async (from, to) => {
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
