import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import StrikePicker, { type StrikeChoice } from '../components/StrikePicker';
import { markJurorStrike } from '../db/repository';

export default function Decision() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

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

  if (!activeCase || !panel) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
        <div className="text-xs text-slate-500">
          Panel {panel.index} — Decision
        </div>
      </header>

      <div className="p-8">
        <SeatGrid
          jurors={panel.jurors}
          onSeatClick={(seat) => {
            const j = panel.jurors.find((x) => x.seatIndex === seat);
            if (j) setOpenJurorId(j.id);
          }}
        />
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
