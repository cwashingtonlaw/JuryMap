import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import JurorDrawer from '../components/JurorDrawer';
import DisqualifyModal, {
  type DisqualifyKind,
} from '../components/DisqualifyModal';
import { replaceInSeat, slideLeft } from '../lib/panel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function Questioning() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);

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
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Questioning
          </div>
        </div>
      </header>

      <div className="p-8">
        <SeatGrid
          jurors={panel.jurors}
          onSeatClick={(s) => setOpenSeat(s)}
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
