import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import {
  createCase,
  populateFirstPanelFromVenire,
  advanceToDecision,
  markJurorStrike,
  finishDecisionsForPanel,
  getCase,
} from '../db/repository';
import SeatedJury from './SeatedJury';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function seatedCase() {
  const c = await createCase({ name: 'Done' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  const fresh = (await getCase(c.id))!;
  const jurors = fresh.panels[0].jurors;
  for (let i = 0; i < 14; i++) {
    await markJurorStrike(c.id, jurors[i].id, { status: 'kept', reason: '' });
  }
  for (let i = 14; i < 21; i++) {
    await markJurorStrike(c.id, jurors[i].id, {
      status: 'struck-peremptory-state',
      reason: 'x',
    });
  }
  await finishDecisionsForPanel(c.id);
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/seated`]}>
      <Routes>
        <Route path="/cases/:caseId/seated" element={<SeatedJury />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SeatedJury', () => {
  it('lists the kept jurors in order', async () => {
    const id = await seatedCase();
    renderAt(id);
    for (let i = 1; i <= 14; i++) {
      expect(await screen.findByText(`J${i}`)).toBeInTheDocument();
    }
  });

  it('labels first 12 as Juror 1..12 and rest as Alternates', async () => {
    const id = await seatedCase();
    renderAt(id);
    expect(await screen.findByText(/Juror 12/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alternate 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alternate 2/i)).toBeInTheDocument();
  });
});
