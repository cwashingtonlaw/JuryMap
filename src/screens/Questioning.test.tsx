import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createCase, populateFirstPanelFromVenire } from '../db/repository';
import Questioning from './Questioning';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
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

  it('replace-in-seat moves the juror out and opens the seat for a new one', async () => {
    const c = await withCase();
    renderAt(c.id);
    const user = userEvent.setup();

    await user.click(await screen.findByText('Juror 1'));
    await user.click(screen.getByText(/disqualify juror/i));
    await user.type(screen.getByPlaceholderText(/hardship/i), 'hardship');
    await user.click(screen.getByRole('button', { name: /^disqualify$/i }));

    // Juror 1's card is still in the list (archived) but seat 1 is empty
    const seat1 = await screen.findByTestId('seat-1');
    expect(seat1.textContent).toMatch(/Empty/);
  });
});
