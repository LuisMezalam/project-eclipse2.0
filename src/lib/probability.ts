/**
 * probability.ts — Consolidated probability & distribution primitives
 *
 * Single source of truth for:
 *   • Normal distribution (PDF, CDF, inverse CDF, random sampling)
 *   • Gamma / Poisson distributions
 *   • Extreme-value families (Gumbel, Weibull, Fréchet)
 *   • Data generators for chart visualization
 *   • Supporting math helpers (gamma function, factorial)
 *
 * All other modules should import from here rather than
 * duplicating these functions in reliability.ts or statistics.ts.
 */

// ============================================================
// §1  NORMAL DISTRIBUTION
// ============================================================

/** Standard normal PDF: φ(x; μ, σ) */
export function normalPDF(x: number, mu: number, sigma: number): number {
  const coefficient = 1 / (sigma * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2));
  return coefficient * Math.exp(exponent);
}

/** Standard normal CDF: Φ(x) — Abramowitz & Stegun approximation */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse standard-normal CDF (probit / quantile function).
 *
 * Rational approximation (Beasley–Springer–Moro).
 * Exported under two aliases for backward compatibility:
 *   normalInverseCDF  ≡  normalQuantile
 */
export function normalInverseCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Alias kept for consumers that imported `normalQuantile` from statistics.ts */
export const normalQuantile = normalInverseCDF;

/** Box–Muller transform: generate a single N(μ, σ) sample */
export function normalRandom(mu = 0, sigma = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * sigma + mu;
}

/** Generate [x, y] pairs for a Normal PDF chart */
export function generateNormalData(mu: number, sigma: number, points = 100): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const range = 4 * sigma;
  const start = mu - range;
  const end = mu + range;
  const step = (end - start) / points;

  for (let x = start; x <= end; x += step) {
    data.push({ x, y: normalPDF(x, mu, sigma) });
  }
  return data;
}

// ============================================================
// §2  GAMMA / POISSON DISTRIBUTIONS
// ============================================================

/** Gamma function — Lanczos approximation */
export function gammaFn(n: number): number {
  if (n === 1) return 1;
  if (n === 0.5) return Math.sqrt(Math.PI);
  if (n > 0 && Number.isInteger(n)) return factorial(n - 1);

  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gammaFn(1 - n));
  }

  const m = n - 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (m + i);
  }
  const t = m + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, m + 0.5) * Math.exp(-t) * x;
}

/** Backward-compatible alias (original export was named `gamma`) */
export { gammaFn as gamma };

export function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function gammaPDF(x: number, alpha: number, theta: number): number {
  if (x <= 0) return 0;
  const coefficient = 1 / (Math.pow(theta, alpha) * gammaFn(alpha));
  return coefficient * Math.pow(x, alpha - 1) * Math.exp(-x / theta);
}

export function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function generateGammaData(alpha: number, theta: number, points = 100): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const maxX = alpha * theta + 5 * Math.sqrt(alpha) * theta;
  const step = maxX / points;
  for (let x = step; x <= maxX; x += step) {
    data.push({ x, y: gammaPDF(x, alpha, theta) });
  }
  return data;
}

export function generatePoissonData(lambda: number, maxK = 20): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  for (let k = 0; k <= maxK; k++) {
    data.push({ x: k, y: poissonPMF(k, lambda) });
  }
  return data;
}

// ============================================================
// §3  EXTREME-VALUE DISTRIBUTIONS
// ============================================================

/** Gumbel (Type I) for maxima */
export function gumbelPDF(x: number, mu: number, beta: number): number {
  const z = (x - mu) / beta;
  return (1 / beta) * Math.exp(-(z + Math.exp(-z)));
}
export function gumbelCDF(x: number, mu: number, beta: number): number {
  const z = (x - mu) / beta;
  return Math.exp(-Math.exp(-z));
}
export function generateGumbelData(mu: number, beta: number, points = 100): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const start = mu - 3 * beta;
  const end = mu + 6 * beta;
  const step = (end - start) / points;
  for (let x = start; x <= end; x += step) {
    data.push({ x, y: gumbelPDF(x, mu, beta) });
  }
  return data;
}

/** Weibull (Type III for minima) */
export function weibullPDF(x: number, k: number, lambda: number): number {
  if (x < 0) return 0;
  return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
}
export function weibullCDF(x: number, k: number, lambda: number): number {
  if (x < 0) return 0;
  return 1 - Math.exp(-Math.pow(x / lambda, k));
}
export function generateWeibullData(k: number, lambda: number, points = 100): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const end = lambda * 3;
  const step = end / points;
  for (let x = step; x <= end; x += step) {
    data.push({ x, y: weibullPDF(x, k, lambda) });
  }
  return data;
}

/** Fréchet (Type II) for heavy-tailed maxima */
export function frechetPDF(x: number, alpha: number, s: number, m: number = 0): number {
  if (x <= m) return 0;
  const z = (x - m) / s;
  return (alpha / s) * Math.pow(z, -1 - alpha) * Math.exp(-Math.pow(z, -alpha));
}
export function frechetCDF(x: number, alpha: number, s: number, m: number = 0): number {
  if (x <= m) return 0;
  const z = (x - m) / s;
  return Math.exp(-Math.pow(z, -alpha));
}
export function generateFrechetData(alpha: number, s: number, m: number = 0, points = 100): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const start = m + 0.1;
  const end = m + s * 5;
  const step = (end - start) / points;
  for (let x = start; x <= end; x += step) {
    data.push({ x, y: frechetPDF(x, alpha, s, m) });
  }
  return data;
}
