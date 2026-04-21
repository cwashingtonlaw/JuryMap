import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import {
  createCase,
  populateFirstPanelFromVenire,
  advanceToDecision,
  markJurorStrike,
  getCase,
} from '../db/repository';
import BatsonAnalysis from './BatsonAnalysis';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function caseWithStrikes() {
  const c = await createCase({ name: 'Batson E2E' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  const fresh = (await getCase(c.id))!;
  const jurors = fresh.panels[0].jurors;
  for (let i = 0; i < 3; i++) {
    await markJurorStrike(c.id, jurors[i].id, {
      status: 'struck-peremptory-state',
      reason: `reason ${i + 1}`,
    });
  }
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/batson`]}>
      <Routes>
        <Route path="/cases/:caseId/batson" element={<BatsonAnalysis />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BatsonAnalysis', () => {
  it('shows cross-tab, strike log, and selects a strike to view comparators', async () => {
    const id = await caseWithStrikes();
    renderAt(id);

    expect(await screen.findByText(/cross-tab summary/i)).toBeInTheDocument();

    const j1Cell = await screen.findByText('J1');
    expect(j1Cell).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(j1Cell);
    expect(
      await screen.findByText(/comparators for j1/i)
    ).toBeInTheDocument();
  });

  it('has an Export Motion Draft button', async () => {
    const id = await caseWithStrikes();
    renderAt(id);
    expect(
      await screen.findByRole('button', { name: /export motion draft/i })
    ).toBeInTheDocument();
  });
});
