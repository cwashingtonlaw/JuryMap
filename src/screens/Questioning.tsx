import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import JurorDrawer from '../components/JurorDrawer';

export default function Questioning() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);

  const [openSeat, setOpenSeat] = useState<number | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const panel = activeCase.panels[activeCase.currentPanelIndex];
  const selectedJuror =
    openSeat != null
      ? panel.jurors.find((j) => j.seatIndex === openSeat)
      : undefined;

  async function patchJuror(mutator: (draft: any) => void) {
    const jurorId = selectedJuror?.id;
    if (!jurorId) return;
    await updateCase((draft) => {
      const p = draft.panels[draft.currentPanelIndex];
      const j = p.jurors.find((x) => x.id === jurorId);
      if (j) mutator(j);
    });
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
        />
      )}
    </div>
  );
}
