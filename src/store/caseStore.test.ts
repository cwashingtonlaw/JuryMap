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

  it('undoes and redoes changes', async () => {
    const c = await createCase({ name: 'Initial' });
    await useCaseStore.getState().loadCase(c.id);
    
    await useCaseStore.getState().updateCase((draft) => {
      draft.meta.name = 'Change 1';
    });
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Change 1');
    expect(useCaseStore.getState().past.length).toBe(1);

    await useCaseStore.getState().undo();
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Initial');
    expect(useCaseStore.getState().past.length).toBe(0);
    expect(useCaseStore.getState().future.length).toBe(1);

    await useCaseStore.getState().redo();
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Change 1');
    expect(useCaseStore.getState().past.length).toBe(1);
    expect(useCaseStore.getState().future.length).toBe(0);
  });

  it('loadCase preserves history if reloading the same case ID', async () => {
    const c = await createCase({ name: 'Initial' });
    await useCaseStore.getState().loadCase(c.id);
    
    await useCaseStore.getState().updateCase((draft) => {
      draft.meta.name = 'Change 1';
    });
    expect(useCaseStore.getState().past.length).toBe(1);

    // Reload same ID
    await useCaseStore.getState().loadCase(c.id);
    expect(useCaseStore.getState().past.length).toBe(1);

    // Load different ID
    const c2 = await createCase({ name: 'Other' });
    await useCaseStore.getState().loadCase(c2.id);
    expect(useCaseStore.getState().past.length).toBe(0);
  });
});
