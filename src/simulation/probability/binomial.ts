export interface BinomialOutcomeRange {
  lowCount: number;
  expectedCount: number;
  highCount: number;
}

function validateBinomial(trials: number, probability: number) {
  if (!Number.isInteger(trials) || trials < 0) throw new RangeError(`trials must be a non-negative integer, got ${trials}`);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError(`probability must be between 0 and 1, got ${probability}`);
  }
}

export function binomialPmf(trials: number, probability: number): number[] {
  validateBinomial(trials, probability);
  if (trials === 0) return [1];
  if (probability === 0) return [1, ...Array<number>(trials).fill(0)];
  if (probability === 1) return [...Array<number>(trials).fill(0), 1];

  const probabilities = Array<number>(trials + 1).fill(0);
  probabilities[0] = Math.pow(1 - probability, trials);
  const ratio = probability / (1 - probability);
  for (let successes = 0; successes < trials; successes += 1) {
    probabilities[successes + 1] = probabilities[successes]
      * ((trials - successes) / (successes + 1))
      * ratio;
  }
  return probabilities;
}

export function binomialQuantile(
  trials: number,
  probability: number,
  quantile: number,
): number {
  validateBinomial(trials, probability);
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new RangeError(`quantile must be between 0 and 1, got ${quantile}`);
  }
  const pmf = binomialPmf(trials, probability);
  let cumulative = 0;
  for (let successes = 0; successes < pmf.length; successes += 1) {
    cumulative += pmf[successes];
    if (cumulative + Number.EPSILON >= quantile) return successes;
  }
  return trials;
}

export function binomialOutcomeRange(
  trials: number,
  probability: number,
): BinomialOutcomeRange {
  validateBinomial(trials, probability);
  return {
    lowCount: binomialQuantile(trials, probability, 0.1),
    expectedCount: trials * probability,
    highCount: binomialQuantile(trials, probability, 0.9),
  };
}
