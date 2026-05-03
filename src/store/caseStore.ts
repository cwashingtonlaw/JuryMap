import { create } from 'zustand';
import { produce } from 'immer';
import type { Case } from '../types/case';
import { getCase, saveCase } from '../db/repository';

interface CaseStore {
  activeCase: Case | null;
  past: Case[];
  future: Case[];
  loadCase: (id: string) => Promise<void>;
  updateCase: (mutator: (draft: Case) => void) => Promise<void>;
  clear: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  activeCase: null,
  past: [],
  future: [],

  loadCase: async (id) => {
    const { activeCase } = get();
    if (activeCase?.id === id) return; 
    const c = await getCase(id);
    if (!c) throw new Error(`Case ${id} not found`);
    set({ activeCase: c, past: [], future: [] });
  },

  updateCase: async (mutator) => {
    const { activeCase: current, past } = get();
    if (!current) throw new Error('No active case');
    const next = produce(current, mutator);
    // Write through in the same tick before setting state
    await saveCase(next);
    set({ 
      activeCase: next, 
      past: [...past, current].slice(-50), // keep last 50 states
      future: [] 
    });
  },

  undo: async () => {
    const { activeCase: current, past, future } = get();
    if (!current || past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    await saveCase(previous);
    set({
      activeCase: previous,
      past: newPast,
      future: [current, ...future]
    });
  },

  redo: async () => {
    const { activeCase: current, past, future } = get();
    if (!current || future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    await saveCase(next);
    set({
      activeCase: next,
      past: [...past, current].slice(-50),
      future: newFuture
    });
  },

  clear: () => set({ activeCase: null, past: [], future: [] }),
}));
