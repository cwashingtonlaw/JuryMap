import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createCase } from '../db/repository';
import CaseList from './CaseList';

async function reset() {
  await db.delete();
  await db.open();
}
beforeEach(reset);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cases" element={<CaseList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CaseList', () => {
  it('shows an empty state when there are no cases', async () => {
    renderAt('/cases');
    expect(await screen.findByText(/no cases yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new case/i })).toBeInTheDocument();
  });

  it('renders a row per case', async () => {
    await createCase({ name: 'State v. Alpha' });
    await createCase({ name: 'State v. Beta' });
    renderAt('/cases');
    expect(await screen.findByText('State v. Alpha')).toBeInTheDocument();
    expect(await screen.findByText('State v. Beta')).toBeInTheDocument();
  });
});
