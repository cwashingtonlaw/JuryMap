import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import CaseSetup from './CaseSetup';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cases/new" element={<CaseSetup />} />
        <Route
          path="/cases/:id/questioning"
          element={<div data-testid="questioning">Questioning</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('CaseSetup', () => {
  it('creates a case and navigates to its Questioning mode', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.type(screen.getByLabelText(/case name/i), 'State v. Smith');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByTestId('questioning')).toBeInTheDocument();
  });

  it('requires a case name', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('applies the capital preset', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.selectOptions(screen.getByLabelText(/peremptory preset/i), 'capital');
    const defenseInput = screen.getByLabelText(
      /defense peremptories/i
    ) as HTMLInputElement;
    expect(defenseInput.value).toBe('12');
  });

  it('persists venireSize computed from seats per row × number of rows', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.type(screen.getByLabelText(/case name/i), 'Small Panel');
    // Set seats per row = 3, rows = 2 → venireSize = 6
    const seatsInput = screen.getByLabelText(/seats per row/i) as HTMLInputElement;
    const rowsInput = screen.getByLabelText(/number of rows/i) as HTMLInputElement;
    await user.tripleClick(seatsInput);
    await user.keyboard('3');
    await user.tripleClick(rowsInput);
    await user.keyboard('2');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByTestId('questioning')).toBeInTheDocument();
    // Verify via the DB
    const dbRows = await (await import('../db/repository')).listCases({ includeArchived: false });
    const latest = dbRows[0];
    const loaded = await (await import('../db/repository')).getCase(latest.id);
    expect(loaded!.meta.venireSize).toBe(6);
    expect(loaded!.meta.customColumns).toBe(3);
  });
});
