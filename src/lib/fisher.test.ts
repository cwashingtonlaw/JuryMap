import { describe, it, expect } from 'vitest';
import { fisherExact2x2 } from './fisher';

describe('fisherExact2x2', () => {
  it('balanced 2x2 has p-value ~1', () => {
    // Perfectly balanced: 2 in each cell
    const r = fisherExact2x2(2, 2, 2, 2);
    expect(r.pTwoTailed).toBeGreaterThan(0.9);
  });

  it('strongly skewed small table gives low p', () => {
    // Classic Fisher demo: tea-tasting Lady, 4x4 cup layout, all correct
    // [[ 4, 0 ], [ 0, 4 ]] → p ≈ 0.028571
    const r = fisherExact2x2(4, 0, 0, 4);
    expect(r.pTwoTailed).toBeLessThan(0.05);
    expect(r.pTwoTailed).toBeCloseTo(0.0286, 3);
  });

  it('known table gives expected two-tailed p', () => {
    // [[ 1, 9 ], [ 11, 3 ]] → p ≈ 0.00277
    // (From Agresti, Introduction to Categorical Data Analysis)
    const r = fisherExact2x2(1, 9, 11, 3);
    expect(r.pTwoTailed).toBeCloseTo(0.00277, 3);
  });

  it('zero total returns p = 1', () => {
    const r = fisherExact2x2(0, 0, 0, 0);
    expect(r.pTwoTailed).toBe(1);
  });

  it('rejects negative inputs without throwing', () => {
    const r = fisherExact2x2(-1, 2, 3, 4);
    expect(r.pTwoTailed).toBe(1);
  });

  it('one-tailed probabilities sum with overlap to ≥ 1', () => {
    // For any table, pLeft + pRight >= 1 (both include the observed probability)
    const r = fisherExact2x2(3, 5, 7, 2);
    expect(r.pLeftTail + r.pRightTail).toBeGreaterThanOrEqual(1 - 1e-9);
  });
});
