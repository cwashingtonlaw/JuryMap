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
} from '../db/repository';
import Decision from './Decision';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function readyCase() {
  const c = await createCase({ name: 'Test' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/decision`]}>
      <Routes>
        <Route
          path="/cases/:caseId/decision"
          element={<Decision />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Decision', () => {
  it('renders all 21 seats', async () => {
    const id = await readyCase();
    renderAt(id);
    const seats = await screen.findAllByTestId(/^seat-\d+$/);
    expect(seats.length).toBe(21);
  });

  it('opens a strike picker when a seat is tapped and saves the decision', async () => {
    const id = await readyCase();
    renderAt(id);
    const user = userEvent.setup();

    await user.click(await screen.findByText('J1'));

    // Picker opens with default "Keep"
    expect(
      await screen.findByRole('heading', { name: /decide: j1/i })
    ).toBeInTheDocument();

    // Choose peremptory-defense and type a reason
    await user.click(screen.getByLabelText(/peremptory — defense/i));
    await user.type(
      screen.getByPlaceholderText(/race-neutral reason/i),
      'prior LE family'
    );
    await user.click(screen.getByRole('button', { name: /save decision/i }));

    // Badge appears on seat 1
    const seat1 = await screen.findByTestId('seat-1');
    expect(seat1.textContent).toMatch(/PEREMPT — D/);
  });

  it('prevents saving a strike without a reason', async () => {
    const id = await readyCase();
    renderAt(id);
    const user = userEvent.setup();

    await user.click(await screen.findByText('J1'));
    await user.click(screen.getByLabelText(/cause — state/i));
    await user.click(screen.getByRole('button', { name: /save decision/i }));

    expect(
      await screen.findByText(/a reason is required/i)
    ).toBeInTheDocument();
  });
});
