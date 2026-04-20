import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createCase, populateFirstPanelFromVenire } from '../db/repository';
import Questioning from './Questioning';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function withCase() {
  const c = await createCase({ name: 'Test' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `Juror ${i + 1}` }))
  );
  return c;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/questioning`]}>
      <Routes>
        <Route
          path="/cases/:caseId/questioning"
          element={<Questioning />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Questioning', () => {
  it('renders 21 seat cards for a full panel', async () => {
    const c = await withCase();
    renderAt(c.id);
    for (let i = 1; i <= 21; i++) {
      expect(await screen.findByText(`Juror ${i}`)).toBeInTheDocument();
    }
  });

  it('renders 21 slots including empty ones', async () => {
    const c = await createCase({ name: 'Empty' });
    renderAt(c.id);
    const slots = await screen.findAllByTestId(/^seat-\d+$/);
    expect(slots.length).toBe(21);
  });
});
