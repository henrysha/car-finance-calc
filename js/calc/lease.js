/**
 * @module lease
 * Lease total cost calculator.
 * Computes monthly payments, sequential lease costs, excess mileage fees,
 * buy-at-end equity, and running monthly cost data over a comparison period.
 */

import { getVehicleValue } from './depreciation.js';

/**
 * Rounds a monetary value to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the monthly lease payment for a given vehicle price and lease parameters.
 * @param {number} vehiclePrice - Capitalized cost of the vehicle.
 * @param {number} residualPercent - Residual value as a fraction (e.g. 0.55).
 * @param {number} leaseTerm - Lease term in months.
 * @param {number} moneyFactor - Money factor (rent charge factor).
 * @param {number} taxRate - Sales tax rate as a decimal.
 * @returns {number} Monthly payment including tax.
 */
function computeMonthlyPayment(vehiclePrice, residualPercent, leaseTerm, moneyFactor, taxRate) {
  const residualValue = vehiclePrice * residualPercent;
  const depreciationPerMonth = (vehiclePrice - residualValue) / leaseTerm;
  const financeChargePerMonth = (vehiclePrice + residualValue) * moneyFactor;
  const basePayment = depreciationPerMonth + financeChargePerMonth;
  return basePayment * (1 + taxRate);
}

/**
 * Calculates the total cost of leasing a vehicle over a comparison period,
 * including sequential leases, excess mileage, optional buy-at-end, and
 * running costs (insurance, maintenance, fuel).
 *
 * @param {Object} params - Lease calculation parameters.
 * @param {number} params.vehiclePrice - MSRP / capitalized cost of the vehicle.
 * @param {number} [params.downPayment=0] - Down payment per lease.
 * @param {number} [params.monthlyPayment=0] - Override monthly payment (0 = auto-calculate).
 * @param {number} [params.leaseTerm=36] - Lease term in months.
 * @param {number} [params.residualPercent=0.55] - Residual value percentage (0–1).
 * @param {number} [params.moneyFactor=0.001] - Money factor.
 * @param {number} [params.mileageAllowance=12000] - Annual mileage allowance.
 * @param {number} [params.excessMileageRate=0.25] - Cost per excess mile.
 * @param {number} [params.expectedAnnualMiles=12000] - Expected annual miles driven.
 * @param {number} [params.acquisitionFee=0] - Dealer/bank acquisition fee per lease.
 * @param {number} [params.dispositionFee=0] - Disposition fee per lease (at turn-in).
 * @param {boolean} [params.buyAtEnd=false] - Whether to buy the last leased vehicle at residual.
 * @param {number} [params.taxRate=0] - Sales tax rate as a decimal (e.g. 0.08 for 8%).
 * @param {number} [params.annualInsurance=0] - Annual insurance cost.
 * @param {number} [params.annualMaintenance=0] - Annual maintenance cost.
 * @param {number} [params.annualFuelCost=0] - Annual fuel cost.
 * @param {number} [params.opportunityRate=0] - Annual opportunity cost rate for down payment.
 * @param {number} [params.comparisonMonths=60] - Total comparison period in months.
 * @param {boolean} [params.isNew=true] - Whether the vehicle is new.
 * @param {boolean} [params.isHybrid=false] - Whether the vehicle is a hybrid/EV.
 * @param {number} [params.taxIncentive=0] - Tax incentive or rebate applied to first lease.
 *
 * @returns {{
 *   monthlyPayment: number,
 *   upfrontCost: number,
 *   totalPayments: number,
 *   totalCost: number,
 *   totalFuelCost: number,
 *   totalInsurance: number,
 *   totalMaintenance: number,
 *   excessMileageCost: number,
 *   numberOfLeases: number,
 *   endCosts: number,
 *   equityAtEnd: number,
 *   effectiveMonthlyCost: number,
 *   monthlyData: Array<{month: number, payment: number, equity: number, cumulativeCost: number, leaseNumber: number}>
 * }}
 */
export function calculateLease(params) {
  const {
    vehiclePrice,
    downPayment = 0,
    monthlyPayment: monthlyPaymentOverride = 0,
    leaseTerm = 36,
    residualPercent = 0.55,
    moneyFactor = 0.001,
    mileageAllowance = 12000,
    excessMileageRate = 0.25,
    expectedAnnualMiles = 12000,
    acquisitionFee = 0,
    dispositionFee = 0,
    buyAtEnd = false,
    taxRate = 0,
    annualInsurance = 0,
    annualMaintenance = 0,
    annualFuelCost = 0,
    opportunityRate = 0,
    comparisonMonths = 60,
    isNew = true,
    isHybrid = false,
    taxIncentive = 0,
  } = params;

  // --- Number of sequential leases ---
  const numberOfLeases = comparisonMonths <= leaseTerm
    ? 1
    : Math.ceil(comparisonMonths / leaseTerm);

  // --- Per-lease parameters ---
  // Each subsequent lease: vehicle price increases by 3%.
  const leases = [];
  for (let i = 0; i < numberOfLeases; i++) {
    const priceMultiplier = Math.pow(1.03, i);
    const leaseVehiclePrice = round2(vehiclePrice * priceMultiplier);

    let payment;
    if (monthlyPaymentOverride > 0 && i === 0) {
      // Use the override only for the first lease; recalculate for subsequent leases
      payment = monthlyPaymentOverride;
    } else if (monthlyPaymentOverride > 0 && i > 0) {
      // Recalculate for subsequent leases even if an override was provided for lease 1
      payment = computeMonthlyPayment(leaseVehiclePrice, residualPercent, leaseTerm, moneyFactor, taxRate);
    } else {
      payment = computeMonthlyPayment(leaseVehiclePrice, residualPercent, leaseTerm, moneyFactor, taxRate);
    }

    leases.push({
      leaseNumber: i + 1,
      vehiclePrice: leaseVehiclePrice,
      monthlyPayment: round2(payment),
    });
  }

  // --- Upfront cost (per lease, but tax incentive only on the first) ---
  const upfrontCostFirstLease = round2(Math.max(0, downPayment + acquisitionFee - taxIncentive));
  const upfrontCostSubsequent = round2(downPayment + acquisitionFee);

  // The "upfrontCost" returned is for the first lease
  const upfrontCost = upfrontCostFirstLease;

  // --- Monthly data ---
  const monthlyData = [];
  let cumulativeCost = 0;
  let totalPayments = 0;

  // Add all upfront costs to cumulative at the start of each lease
  const upfrontCosts = [];
  for (let i = 0; i < numberOfLeases; i++) {
    upfrontCosts.push(i === 0 ? upfrontCostFirstLease : upfrontCostSubsequent);
  }

  const monthlyInsurance = annualInsurance / 12;
  const monthlyMaintenance = annualMaintenance / 12;
  const monthlyFuel = annualFuelCost / 12;
  const monthlyRunningCost = monthlyInsurance + monthlyMaintenance + monthlyFuel;

  for (let month = 1; month <= comparisonMonths; month++) {
    const leaseIndex = Math.min(
      Math.floor((month - 1) / leaseTerm),
      numberOfLeases - 1
    );
    const leaseNumber = leaseIndex + 1;
    const monthInLease = month - leaseIndex * leaseTerm;

    // Add upfront cost at the start of each lease
    if (monthInLease === 1) {
      cumulativeCost += upfrontCosts[leaseIndex];
    }

    const payment = leases[leaseIndex].monthlyPayment;
    totalPayments += payment;
    cumulativeCost += payment + monthlyRunningCost;

    // Equity is 0 for leased vehicles (you don't own them)
    const equity = 0;

    monthlyData.push({
      month,
      payment: round2(payment),
      equity: round2(equity),
      cumulativeCost: round2(cumulativeCost),
      leaseNumber,
    });
  }

  totalPayments = round2(totalPayments);

  // --- Excess mileage ---
  const excessMilesPerYear = Math.max(0, expectedAnnualMiles - mileageAllowance);
  const excessMileageCostPerLease = round2(excessMilesPerYear * excessMileageRate * (leaseTerm / 12));
  const excessMileageCost = round2(excessMileageCostPerLease * numberOfLeases);

  // --- End costs ---
  const lastLease = leases[numberOfLeases - 1];
  const lastLeaseResidualValue = round2(lastLease.vehiclePrice * residualPercent);
  let endCosts;
  if (buyAtEnd) {
    // Disposition fee for all leases except the last (which is bought out), plus residual purchase
    endCosts = round2(dispositionFee * (numberOfLeases - 1) + lastLeaseResidualValue);
  } else {
    endCosts = round2(dispositionFee * numberOfLeases);
  }

  // --- Equity at end ---
  let equityAtEnd = 0;
  if (buyAtEnd) {
    // Months of ownership after buying: remaining months in comparison period after the last lease starts
    const lastLeaseStartMonth = (numberOfLeases - 1) * leaseTerm;
    const monthsIntoLastLease = comparisonMonths - lastLeaseStartMonth;
    // Market value of the car at the point of ownership
    const marketValue = getVehicleValue(lastLease.vehiclePrice, monthsIntoLastLease, true, 0, isHybrid);
    // Net equity = market value minus the residual price paid
    equityAtEnd = round2(Math.max(0, marketValue - lastLeaseResidualValue));
  }

  // --- Opportunity cost ---
  const opportunityCost = round2(
    downPayment * Math.pow(1 + opportunityRate / 12, comparisonMonths) - downPayment
  );

  // --- Running costs ---
  const totalFuelCost = round2(annualFuelCost * (comparisonMonths / 12));
  const totalInsurance = round2(annualInsurance * (comparisonMonths / 12));
  const totalMaintenance = round2(annualMaintenance * (comparisonMonths / 12));

  // --- Total upfront across all leases ---
  let totalUpfront = upfrontCostFirstLease;
  for (let i = 1; i < numberOfLeases; i++) {
    totalUpfront += upfrontCostSubsequent;
  }
  totalUpfront = round2(totalUpfront);

  // --- Total cost ---
  const totalCost = round2(
    totalUpfront
    + totalPayments
    + excessMileageCost
    + endCosts
    + opportunityCost
    + totalFuelCost
    + totalInsurance
    + totalMaintenance
    - equityAtEnd
  );

  // --- Effective monthly cost ---
  const effectiveMonthlyCost = round2(totalCost / comparisonMonths);

  // --- First lease's monthly payment for the return value ---
  const returnedMonthlyPayment = leases[0].monthlyPayment;

  return {
    monthlyPayment: round2(returnedMonthlyPayment),
    upfrontCost,
    totalPayments,
    totalCost,
    totalFuelCost,
    totalInsurance,
    totalMaintenance,
    excessMileageCost,
    numberOfLeases,
    endCosts,
    equityAtEnd,
    effectiveMonthlyCost,
    monthlyData,
  };
}
