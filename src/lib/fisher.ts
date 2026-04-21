// Fisher's exact test on a 2×2 contingency table.
//
// Given:
//    [ a  b ]
//    [ c  d ]
//
// The hypergeometric probability of seeing exactly `a` in the top-left,
// given fixed row and column sums, is
//
//    P(a) = C(a+b, a) * C(c+d, c) / C(n, a+c)
//
// where C(n,k) is the binomial coefficient and n = a+b+c+d.
//
// We compute using log-gamma for numerical stability, then exponentiate.
// The two-tailed p-value is the sum of probabilities P(k) over all k
// in [0, row1Total] such that P(k) <= P(a) (i.e., as or more extreme).

function logGamma(x: number): number {
  // Lanczos approximation, reasonable precision for x >= 1.
  // For integer inputs we only need x >= 1.
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Reflection, just in case
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let xPrime = p[0];
  for (let i = 1; i < g + 2; i++) {
    xPrime += p[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(xPrime);
}

function logBinom(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function logHyperProb(a: number, b: number, c: number, d: number): number {
  const n = a + b + c + d;
  // P(a | marginals) = C(a+b, a) * C(c+d, c) / C(n, a+c)
  return logBinom(a + b, a) + logBinom(c + d, c) - logBinom(n, a + c);
}

export interface FisherResult {
  pTwoTailed: number;
  pLeftTail: number;
  pRightTail: number;
  observedP: number; // P(observed a | marginals)
}

export function fisherExact2x2(
  a: number,
  b: number,
  c: number,
  d: number
): FisherResult {
  if (a < 0 || b < 0 || c < 0 || d < 0) {
    return { pTwoTailed: 1, pLeftTail: 1, pRightTail: 1, observedP: 0 };
  }
  const n = a + b + c + d;
  if (n === 0) {
    return { pTwoTailed: 1, pLeftTail: 1, pRightTail: 1, observedP: 1 };
  }
  const row1 = a + b;
  const col1 = a + c;
  const kMin = Math.max(0, col1 - (c + d));
  const kMax = Math.min(row1, col1);

  const observedLogP = logHyperProb(a, b, c, d);
  const observedP = Math.exp(observedLogP);

  let pLeft = 0;
  let pRight = 0;
  let pTwo = 0;
  for (let k = kMin; k <= kMax; k++) {
    const kb = row1 - k;
    const kc = col1 - k;
    const kd = n - k - kb - kc;
    const lp = logHyperProb(k, kb, kc, kd);
    const prob = Math.exp(lp);
    if (k <= a) pLeft += prob;
    if (k >= a) pRight += prob;
    // Two-tailed: sum probabilities at-or-less-than the observed probability
    // (doubling left/right would overcount the mode in asymmetric tables).
    if (lp <= observedLogP + 1e-9) pTwo += prob;
  }

  // Clamp to [0, 1] — floating-point accumulation can overshoot by ~1e-10.
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return {
    pTwoTailed: clamp(pTwo),
    pLeftTail: clamp(pLeft),
    pRightTail: clamp(pRight),
    observedP,
  };
}
