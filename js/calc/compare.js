/**
 * @module compare
 * Cross-method and cross-fuel-type comparison engine.
 * Receives pre-computed results from cash, finance, and lease calculators
 * (each run for gas and hybrid variants) and produces rankings,
 * recommendations, and sensitivity notes.
 */

/**
 * Rounds a monetary value to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a dollar amount for display in recommendation strings.
 * @param {number} value
 * @returns {string}
 */
function formatDollars(value) {
  return '$' + Math.round(value).toLocaleString('en-US');
}

/**
 * Compares all purchase/lease scenarios across methods and fuel types,
 * producing rankings, a winner, method/fuel recommendations, a combined
 * recommendation sentence, and sensitivity notes.
 *
 * Any scenario parameter can be null if the user hasn't configured it.
 *
 * @param {Object|null} cashGas - Result from cash calculator for gasoline vehicle.
 * @param {Object|null} cashHybrid - Result from cash calculator for hybrid vehicle.
 * @param {Object|null} financeGas - Result from finance calculator for gasoline vehicle.
 * @param {Object|null} financeHybrid - Result from finance calculator for hybrid vehicle.
 * @param {Object|null} leaseGas - Result from lease calculator for gasoline vehicle.
 * @param {Object|null} leaseHybrid - Result from lease calculator for hybrid vehicle.
 * @param {Object|null} fuelAnalysis - Fuel analysis with { breakevenMonths, annualFuelSavings }.
 *
 * @returns {{
 *   rankings: {
 *     byTotalCost: Array<{method: string, fuelType: string, totalCost: number, effectiveMonthlyCost: number, equityAtEnd: number}>,
 *     byMonthlyCost: Array<{method: string, fuelType: string, totalCost: number, effectiveMonthlyCost: number, equityAtEnd: number}>,
 *     byEquity: Array<{method: string, fuelType: string, totalCost: number, effectiveMonthlyCost: number, equityAtEnd: number}>
 *   },
 *   winner: {method: string, fuelType: string, totalCost: number, savings: number}|null,
 *   methodRecommendation: {best: string, reason: string},
 *   fuelRecommendation: {best: string, reason: string, breakevenMonths: number|null},
 *   combinedRecommendation: string,
 *   sensitivityNotes: string[]
 * }}
 */
export function compareAll(cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid, fuelAnalysis) {
  // --- Build entries from non-null scenarios ---
  const scenarioMap = [
    { data: cashGas, method: 'cash', fuelType: 'gas' },
    { data: cashHybrid, method: 'cash', fuelType: 'hybrid' },
    { data: financeGas, method: 'finance', fuelType: 'gas' },
    { data: financeHybrid, method: 'finance', fuelType: 'hybrid' },
    { data: leaseGas, method: 'lease', fuelType: 'gas' },
    { data: leaseHybrid, method: 'lease', fuelType: 'hybrid' },
  ];

  const entries = scenarioMap
    .filter(s => s.data != null)
    .map(s => ({
      method: s.method,
      fuelType: s.fuelType,
      totalCost: s.data.totalCost,
      effectiveMonthlyCost: s.data.effectiveMonthlyCost,
      equityAtEnd: s.data.equityAtEnd,
    }));

  // --- Handle empty / minimal cases ---
  const emptyRankings = { byTotalCost: [], byMonthlyCost: [], byEquity: [] };

  if (entries.length === 0) {
    return {
      rankings: emptyRankings,
      winner: null,
      methodRecommendation: { best: '', reason: 'No scenarios provided for comparison.' },
      fuelRecommendation: { best: '', reason: 'No scenarios provided for comparison.', breakevenMonths: null },
      combinedRecommendation: 'No scenarios available for comparison.',
      sensitivityNotes: [],
    };
  }

  // --- Pick helper: extracts the display fields from an entry ---
  const pick = (entry) => ({
    method: entry.method,
    fuelType: entry.fuelType,
    totalCost: round2(entry.totalCost),
    effectiveMonthlyCost: round2(entry.effectiveMonthlyCost),
    equityAtEnd: round2(entry.equityAtEnd),
  });

  // --- Rankings ---
  const byTotalCost = [...entries].sort((a, b) => a.totalCost - b.totalCost).map(pick);
  const byMonthlyCost = [...entries].sort((a, b) => a.effectiveMonthlyCost - b.effectiveMonthlyCost).map(pick);
  const byEquity = [...entries].sort((a, b) => b.equityAtEnd - a.equityAtEnd).map(pick);

  const rankings = { byTotalCost, byMonthlyCost, byEquity };

  // --- Winner ---
  const winnerEntry = byTotalCost[0];
  const savings = byTotalCost.length > 1
    ? round2(byTotalCost[1].totalCost - winnerEntry.totalCost)
    : 0;

  const winner = {
    method: winnerEntry.method,
    fuelType: winnerEntry.fuelType,
    totalCost: winnerEntry.totalCost,
    savings,
  };

  // --- Method recommendation ---
  const methodRecommendation = buildMethodRecommendation(entries, byTotalCost, byMonthlyCost);

  // --- Fuel recommendation ---
  const fuelRecommendation = buildFuelRecommendation(entries, fuelAnalysis);

  // --- Combined recommendation ---
  const combinedRecommendation = buildCombinedRecommendation(winner, methodRecommendation, fuelRecommendation);

  // --- Sensitivity notes ---
  const sensitivityNotes = buildSensitivityNotes(byTotalCost, fuelAnalysis, entries);

  return {
    rankings,
    winner,
    methodRecommendation,
    fuelRecommendation,
    combinedRecommendation,
    sensitivityNotes,
  };
}

/**
 * Builds the method recommendation by comparing methods across fuel types.
 * @param {Array} entries - All scenario entries.
 * @param {Array} byTotalCost - Entries sorted by total cost.
 * @param {Array} byMonthlyCost - Entries sorted by monthly cost.
 * @returns {{best: string, reason: string}}
 */
function buildMethodRecommendation(entries, byTotalCost, byMonthlyCost) {
  const methods = ['cash', 'finance', 'lease'];
  const availableMethods = [...new Set(entries.map(e => e.method))];

  if (availableMethods.length === 0) {
    return { best: '', reason: 'No methods available for comparison.' };
  }

  if (availableMethods.length === 1) {
    return { best: availableMethods[0], reason: `Only ${availableMethods[0]} scenario was provided.` };
  }

  // Score methods by their position in rankings (lower index = better)
  const scores = {};
  for (const method of availableMethods) {
    scores[method] = 0;
  }

  // Award points: 1st = 3pts, 2nd = 2pts, 3rd = 1pt in each ranking
  const rankingArrays = [byTotalCost, byMonthlyCost];
  for (const ranking of rankingArrays) {
    for (let i = 0; i < ranking.length; i++) {
      const points = Math.max(0, ranking.length - i);
      scores[ranking[i].method] = (scores[ranking[i].method] || 0) + points;
    }
  }

  // Find best method
  let bestMethod = availableMethods[0];
  let bestScore = scores[bestMethod];
  for (const method of availableMethods) {
    if (scores[method] > bestScore) {
      bestMethod = method;
      bestScore = scores[method];
    }
  }

  // Generate reason
  let reason;
  const bestTotalCostEntry = byTotalCost.find(e => e.method === bestMethod);
  const lowestMonthlyCostEntry = byMonthlyCost[0];

  if (bestMethod === 'cash') {
    // Find the runner-up's total cost for comparison
    const runnerUp = byTotalCost.find(e => e.method !== 'cash');
    if (runnerUp) {
      const diff = round2(runnerUp.totalCost - bestTotalCostEntry.totalCost);
      reason = `Cash purchase saves ${formatDollars(diff)} compared to ${runnerUp.method === 'finance' ? 'financing' : 'leasing'}`;
    } else {
      reason = 'Cash purchase offers the lowest total cost';
    }
  } else if (bestMethod === 'finance') {
    const cashEntry = byTotalCost.find(e => e.method === 'cash');
    if (cashEntry) {
      const diff = round2(cashEntry.totalCost - bestTotalCostEntry.totalCost);
      if (diff > 0) {
        reason = `Financing saves ${formatDollars(diff)} compared to cash purchase`;
      } else {
        reason = 'Financing offers the best balance of cost and equity';
      }
    } else {
      reason = 'Financing offers the best balance of total cost and monthly payments';
    }
  } else {
    // lease
    reason = `Leasing offers lowest monthly cost at ${formatDollars(lowestMonthlyCostEntry.effectiveMonthlyCost)}/mo`;
  }

  return { best: bestMethod, reason };
}

/**
 * Builds the fuel type recommendation by comparing gas vs hybrid scenarios.
 * @param {Array} entries - All scenario entries.
 * @param {Object|null} fuelAnalysis - Fuel analysis data.
 * @returns {{best: string, reason: string, breakevenMonths: number|null}}
 */
function buildFuelRecommendation(entries, fuelAnalysis) {
  const gasEntries = entries.filter(e => e.fuelType === 'gas');
  const hybridEntries = entries.filter(e => e.fuelType === 'hybrid');

  // If only one fuel type is available
  if (gasEntries.length === 0 && hybridEntries.length === 0) {
    return { best: '', reason: 'No fuel type data available.', breakevenMonths: null };
  }
  if (gasEntries.length === 0) {
    return { best: 'hybrid', reason: 'Only hybrid scenarios were provided.', breakevenMonths: fuelAnalysis?.breakevenMonths ?? null };
  }
  if (hybridEntries.length === 0) {
    return { best: 'gas', reason: 'Only gasoline scenarios were provided.', breakevenMonths: fuelAnalysis?.breakevenMonths ?? null };
  }

  // Average total cost for each fuel type
  const avgGasCost = gasEntries.reduce((sum, e) => sum + e.totalCost, 0) / gasEntries.length;
  const avgHybridCost = hybridEntries.reduce((sum, e) => sum + e.totalCost, 0) / hybridEntries.length;

  const breakevenMonths = fuelAnalysis?.breakevenMonths ?? null;
  const diff = round2(Math.abs(avgGasCost - avgHybridCost));

  if (avgHybridCost < avgGasCost) {
    return {
      best: 'hybrid',
      reason: `Hybrid saves ${formatDollars(diff)} over the comparison period`,
      breakevenMonths,
    };
  } else {
    return {
      best: 'gas',
      reason: "Gasoline is more cost-effective — hybrid doesn't break even within the comparison period",
      breakevenMonths,
    };
  }
}

/**
 * Builds a single plain-English combined recommendation sentence.
 * @param {{method: string, fuelType: string, totalCost: number, savings: number}} winner
 * @param {{best: string, reason: string}} methodRec
 * @param {{best: string, reason: string, breakevenMonths: number|null}} fuelRec
 * @returns {string}
 */
function buildCombinedRecommendation(winner, methodRec, fuelRec) {
  if (!winner) {
    return 'No scenarios available for comparison.';
  }

  const methodName = winner.method;
  const fuelName = fuelRec.best || winner.fuelType;

  const methodVerb = methodName === 'cash'
    ? 'Buy with cash'
    : methodName === 'finance'
      ? 'Finance'
      : 'Lease';

  const fuelLabel = fuelName === 'hybrid' ? 'a hybrid' : 'a gasoline vehicle';

  if (winner.savings > 0) {
    return `${methodVerb} ${fuelLabel} — you'll save ${formatDollars(winner.savings)} compared to the next best option`;
  }

  return `${methodVerb} using ${fuelLabel} for the lowest total cost`;
}

/**
 * Builds an array of sensitivity notes highlighting marginal or close results.
 * @param {Array} byTotalCost - Entries sorted by total cost ascending.
 * @param {Object|null} fuelAnalysis - Fuel analysis data.
 * @param {Array} entries - All scenario entries.
 * @returns {string[]}
 */
function buildSensitivityNotes(byTotalCost, fuelAnalysis, entries) {
  const notes = [];

  // Check if hybrid breakeven is marginal
  if (fuelAnalysis && fuelAnalysis.breakevenMonths != null) {
    // Estimate comparison period from entries (assume all use the same)
    // We don't have comparisonMonths directly, but we can infer from context
    // Since we can't know comparisonMonths, check if breakevenMonths is close to
    // a typical 60-month period, or use a heuristic:
    // If any entries exist, the breakeven being within a reasonable range is what matters.
    // We'll check if breakevenMonths is > 0 and the breakeven is "marginal"
    // by checking if it's within 6 months of reasonable comparison periods (36, 48, 60, 72, 84).
    const commonPeriods = [36, 48, 60, 72, 84];
    for (const period of commonPeriods) {
      if (Math.abs(fuelAnalysis.breakevenMonths - period) <= 6) {
        notes.push('Hybrid breakeven is marginal — small changes in gas prices could tip the balance');
        break;
      }
    }
  }

  // Check if top 2 options are within 5% of each other
  if (byTotalCost.length >= 2) {
    const first = byTotalCost[0].totalCost;
    const second = byTotalCost[1].totalCost;
    if (first > 0) {
      const percentDiff = ((second - first) / first) * 100;
      if (percentDiff <= 5) {
        notes.push('Top options are very close — consider convenience and lifestyle factors');
      }
    }
  }

  // Check for big equity difference between top options
  if (byTotalCost.length >= 2) {
    const topEquity = byTotalCost[0].equityAtEnd;
    const secondEquity = byTotalCost[1].equityAtEnd;
    const equityDiff = Math.abs(topEquity - secondEquity);
    if (equityDiff > 1000) {
      const higherEquityMethod = topEquity > secondEquity
        ? byTotalCost[0].method
        : byTotalCost[1].method;
      notes.push(`Consider that ${higherEquityMethod} builds ${formatDollars(equityDiff)} more equity`);
    }
  }

  return notes;
}
