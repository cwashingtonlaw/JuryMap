import { describe, it, expect } from 'vitest';
import {
  ANALOGIES,
  TOPIC_LABELS,
  analogyById,
  analogiesByTopic,
} from './analogies';

describe('ANALOGIES', () => {
  it('has at least one analogy per topic', () => {
    const topics = new Set(ANALOGIES.map((a) => a.topic));
    for (const t of Object.keys(TOPIC_LABELS)) {
      expect(topics.has(t as keyof typeof TOPIC_LABELS)).toBe(true);
    }
  });

  it('every analogy has unique id and at least one step with a checkpoint', () => {
    const ids = new Set<string>();
    for (const a of ANALOGIES) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
      expect(a.steps.length).toBeGreaterThan(0);
      const hasCheckpoint = a.steps.some((s) => !!s.checkpoint);
      expect(hasCheckpoint).toBe(true);
    }
  });

  it('every checkpoint has a unique id within its analogy', () => {
    for (const a of ANALOGIES) {
      const cpIds = new Set<string>();
      for (const s of a.steps) {
        if (!s.checkpoint) continue;
        expect(cpIds.has(s.checkpoint.id)).toBe(false);
        cpIds.add(s.checkpoint.id);
      }
    }
  });
});

describe('analogyById', () => {
  it('returns the analogy with the given id', () => {
    expect(analogyById('pilot-and-plane')?.title).toMatch(/pilot/i);
  });
  it('returns undefined for unknown id', () => {
    expect(analogyById('not-a-real-id')).toBeUndefined();
  });
});

describe('analogiesByTopic', () => {
  it('returns only analogies for the given topic', () => {
    const burden = analogiesByTopic('burden-of-proof');
    expect(burden.length).toBeGreaterThan(0);
    for (const a of burden) expect(a.topic).toBe('burden-of-proof');
  });
});
