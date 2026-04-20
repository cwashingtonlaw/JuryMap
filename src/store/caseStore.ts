import { create } from 'zustand';
import { produce } from 'immer';
import type { Case } from '../types/case';
import { getCase, saveCase } from '../db/repository';

interface CaseStore {
  activeCase: Case | null;
  loadCase: (id: string) => Promise<void>;
  updateCase: (mutator: (draft: Case) => void) => Promise<void>;
  clear: () => void;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  activeCase: null,

  loadCase: async (id) => {
    const c = await getCase(id);
    if (!c) throw new Error(`Case ${id} not found`);
    set({ activeCase: c });
  },

  updateCase: async (mutator) => {
    const current = get().activeCase;
    if (!current) throw new Error('No active case');
    const next = produce(current, mutator);
    // Write through in the same tick before setting state
    await saveCase(next);
    set({ activeCase: next });
  },

  clear: () => set({ activeCase: null }),
}));
