import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/db';
import { createCase } from '../db/repository';
import { useCaseStore } from './caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

describe('caseStore', () => {
  it('loads a case by id', async () => {
    const c = await createCase({ name: 'Loaded' });
    await useCaseStore.getState().loadCase(c.id);
    expect(useCaseStore.getState().activeCase?.id).toBe(c.id);
  });

  it('updateCase writes through to IndexedDB', async () => {
    const c = await createCase({ name: 'Original' });
    await useCaseStore.getState().loadCase(c.id);
    await useCaseStore.getState().updateCase((draft) => {
      draft.meta.name = 'Renamed';
    });
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Renamed');
    // Reload fresh from DB
    useCaseStore.setState({ activeCase: null });
    await useCaseStore.getState().loadCase(c.id);
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Renamed');
  });

  it('updateCase throws when no case is loaded', async () => {
    await expect(
      useCaseStore.getState().updateCase(() => {})
    ).rejects.toThrow(/no active case/i);
  });
});
