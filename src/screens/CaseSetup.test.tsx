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

  it('persists venireSize when the user picks 6', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.type(screen.getByLabelText(/case name/i), 'Small Panel');
    await user.selectOptions(screen.getByLabelText(/venire size/i), '6');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByTestId('questioning')).toBeInTheDocument();
    // Verify via the DB
    const rows = await (await import('../db/repository')).listCases({ includeArchived: false });
    const latest = rows[0];
    const loaded = await (await import('../db/repository')).getCase(latest.id);
    expect(loaded!.meta.venireSize).toBe(6);
  });
});
