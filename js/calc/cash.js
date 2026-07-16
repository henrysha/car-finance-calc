import { getDepreciationSchedule } from './depreciation.js';

/**
 * @typedef {Object} CashParams
 * @property {number} vehiclePrice - Purchase price of the vehicle
 * @property {number} [taxRate=0] - Sales tax rate as a decimal (e.g., 0.07 for 7%)
 * @property {number} [fees=0] - Additional fees (registration, documentation, etc.)
 * @property {number} [annualInsurance=0] - Annual insurance cost
 * @property {number} [annualMaintenance=0] - Annual maintenance cost
 * @property {number} [annualFuelCost=0] - Annual fuel/energy cost
 * @property {number} [opportunityRate=0] - Annual opportunity cost rate as a decimal (e.g., 0.07 for 7%)
 * @property {number} [comparisonMonths=60] - Number of months for comparison period
 * @property {boolean} [isNew=true] - Whether the vehicle is new
 * @property {number} [startAgeMonths=0] - Starting age of the vehicle in months (for used vehicles)
 * @property {boolean} [isHybrid=false] - Whether the vehicle is a hybrid/electric
 * @property {number} [taxIncentive=0] - Tax incentive or rebate amount
 */

/**
 * @typedef {Object} CashMonthlyEntry
 * @property {number} month - Month number (0 to comparisonMonths)
 * @property {number} equity - Equity in the vehicle (same as vehicleValue since owned outright)
 * @property {number} vehicleValue - Current market value of the vehicle
 * @property {number} cumulativeCost - Total net cost incurred up to this month
 */

/**
 * @typedef {Object} CashResult
 * @property {number} upfrontCost - Total upfront cash outlay (price + tax + fees - incentive)
 * @property {number} totalCost - Total cost of ownership over the comparison period
 * @property {number} opportunityCost - Cost of foregone investment returns on the upfront cash
 * @property {number} totalFuelCost - Total fuel/energy cost over the comparison period
 * @property {number} totalInsurance - Total insurance cost over the comparison period
 * @property {number} totalMaintenance - Total maintenance cost over the comparison period
 * @property {number} totalTax - Total sales tax paid
 * @property {number} totalFees - Total fees paid
 * @property {number} vehicleValueAtEnd - Depreciated vehicle value at end of comparison period
 * @property {number} equityAtEnd - Equity at end (same as vehicleValueAtEnd for cash purchase)
 * @property {number} effectiveMonthlyCost - Average monthly cost over the comparison period
 * @property {CashMonthlyEntry[]} monthlyData - Month-by-month breakdown
 */

/**
 * Calculates the total cost of a cash vehicle purchase over a comparison period.
 *
 * Accounts for upfront costs, opportunity cost of capital, running costs
 * (insurance, maintenance, fuel), and vehicle depreciation. Produces a
 * month-by-month schedule showing equity and cumulative cost at each point.
 *
 * @param {CashParams} params - Cash purchase parameters
 * @returns {CashResult} Detailed cost breakdown and monthly schedule
 */
export function calculateCash(params) {
  const {
    vehiclePrice,
    taxRate = 0,
    fees = 0,
    annualInsurance = 0,
    annualMaintenance = 0,
    annualFuelCost = 0,
    opportunityRate = 0,
    comparisonMonths = 60,
    isNew = true,
    startAgeMonths = 0,
    isHybrid = false,
    taxIncentive = 0,
  } = params;

  const round2 = (x) => Math.round(x * 100) / 100;

  // --- Upfront cost ---
  const totalTax = round2(vehiclePrice * taxRate);
  const upfrontCost = round2(
    Math.max(0, vehiclePrice + totalTax + fees - taxIncentive)
  );

  // --- Running costs ---
  const years = comparisonMonths / 12;
  const totalFuelCost = round2(annualFuelCost * years);
  const totalInsurance = round2(annualInsurance * years);
  const totalMaintenance = round2(annualMaintenance * years);

  // --- Opportunity cost (compound interest on upfront cash) ---
  const monthlyOppRate = opportunityRate / 12;
  const opportunityCost = round2(
    upfrontCost * Math.pow(1 + monthlyOppRate, comparisonMonths) - upfrontCost
  );

  // --- Depreciation ---
  const depreciationSchedule = getDepreciationSchedule(
    vehiclePrice,
    comparisonMonths,
    isNew,
    startAgeMonths,
    isHybrid
  );

  // We need to look up the final month's value
  const vehicleValueAtEnd = round2(depreciationSchedule[comparisonMonths].value);

  // --- Total cost ---
  const totalCost = round2(
    upfrontCost +
      opportunityCost +
      totalFuelCost +
      totalInsurance +
      totalMaintenance -
      vehicleValueAtEnd
  );

  // Equity at end — you own the car outright
  const equityAtEnd = round2(vehicleValueAtEnd);

  // Effective monthly cost
  const effectiveMonthlyCost = round2(
    comparisonMonths > 0 ? totalCost / comparisonMonths : 0
  );

  // --- Monthly data ---
  const monthlyInsurance = annualInsurance / 12;
  const monthlyMaintenance = annualMaintenance / 12;
  const monthlyFuel = annualFuelCost / 12;

  /** @type {CashMonthlyEntry[]} */
  const monthlyData = [];

  for (let m = 0; m <= comparisonMonths; m++) {
    const vehicleValue = round2(depreciationSchedule[m].value);
    const equity = round2(vehicleValue); // Owned outright

    // Running costs accumulated up to month m
    const runningCosts = (monthlyInsurance + monthlyMaintenance + monthlyFuel) * m;

    // Proportional opportunity cost at month m
    const oppCostAtM = upfrontCost * Math.pow(1 + monthlyOppRate, m) - upfrontCost;

    const cumulativeCost = round2(
      upfrontCost + runningCosts + oppCostAtM - vehicleValue
    );

    monthlyData.push({ month: m, equity, vehicleValue, cumulativeCost });
  }

  return {
    upfrontCost,
    totalCost,
    opportunityCost,
    totalFuelCost,
    totalInsurance,
    totalMaintenance,
    totalTax,
    totalFees: round2(fees),
    vehicleValueAtEnd,
    equityAtEnd,
    effectiveMonthlyCost,
    monthlyData,
  };
}
