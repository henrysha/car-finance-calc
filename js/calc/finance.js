import { getDepreciationSchedule } from './depreciation.js';

/**
 * @typedef {Object} FinanceParams
 * @property {number} vehiclePrice - Purchase price of the vehicle
 * @property {number} [downPayment=0] - Down payment amount
 * @property {number} [tradeIn=0] - Trade-in value applied to purchase
 * @property {number} [apr=0] - Annual percentage rate as a decimal (e.g., 0.05 for 5%)
 * @property {number} [termMonths=60] - Loan term in months
 * @property {number} [extraMonthlyPayment=0] - Additional monthly payment toward principal
 * @property {number} [taxRate=0] - Sales tax rate as a decimal (e.g., 0.07 for 7%)
 * @property {number} [fees=0] - Additional fees (registration, documentation, etc.)
 * @property {number} [annualInsurance=0] - Annual insurance cost
 * @property {number} [annualMaintenance=0] - Annual maintenance cost
 * @property {number} [annualFuelCost=0] - Annual fuel/energy cost
 * @property {number} [opportunityRate=0] - Annual opportunity cost rate as a decimal
 * @property {number} [comparisonMonths=60] - Number of months for comparison period
 * @property {boolean} [isNew=true] - Whether the vehicle is new
 * @property {number} [startAgeMonths=0] - Starting age of the vehicle in months (for used vehicles)
 * @property {boolean} [isHybrid=false] - Whether the vehicle is a hybrid/electric
 * @property {number} [taxIncentive=0] - Tax incentive or rebate amount
 */

/**
 * @typedef {Object} FinanceMonthlyEntry
 * @property {number} month - Month number (1 to comparisonMonths)
 * @property {number} payment - Total payment made this month (principal + interest)
 * @property {number} principal - Principal portion of the payment
 * @property {number} interest - Interest portion of the payment
 * @property {number} balance - Remaining loan balance after this payment
 * @property {number} equity - Vehicle value minus remaining loan balance
 * @property {number} vehicleValue - Current market value of the vehicle
 * @property {number} cumulativeCost - Total net cost incurred up to this month
 */

/**
 * @typedef {Object} FinanceResult
 * @property {number} monthlyPayment - Calculated base monthly payment (before extra payments)
 * @property {number} loanAmount - Total amount financed
 * @property {number} upfrontCost - Cash paid upfront (down payment)
 * @property {number} totalPayments - Sum of all loan payments made
 * @property {number} totalInterest - Sum of all interest paid
 * @property {number} totalCost - Total cost of ownership over the comparison period
 * @property {number} totalFuelCost - Total fuel/energy cost over the comparison period
 * @property {number} totalInsurance - Total insurance cost over the comparison period
 * @property {number} totalMaintenance - Total maintenance cost over the comparison period
 * @property {number} vehicleValueAtEnd - Depreciated vehicle value at end of comparison period
 * @property {number} equityAtEnd - Vehicle value minus any remaining balance at end
 * @property {number} effectiveMonthlyCost - Average monthly cost over the comparison period
 * @property {number|null} payoffMonth - Month when the loan was fully paid off, or null if not paid off
 * @property {FinanceMonthlyEntry[]} monthlyData - Month-by-month amortization and cost breakdown
 */

/**
 * Calculates the total cost of a financed vehicle purchase over a comparison period.
 *
 * Builds a full amortization schedule accounting for extra payments and early payoff.
 * Tracks vehicle depreciation against loan balance to show equity position over time.
 * Includes opportunity cost on the down payment, running costs, and cumulative cost
 * tracking at each month.
 *
 * Edge cases handled:
 * - 0% APR: Uses simple division for monthly payment (no interest)
 * - 0 down payment: No opportunity cost on down payment
 * - loanAmount = 0: No loan payments, vehicle is effectively paid in full
 * - termMonths = 0: Monthly payment is 0 (no loan term)
 * - comparisonMonths < termMonths: Loan may still have a balance at end of comparison
 *
 * @param {FinanceParams} params - Financing parameters
 * @returns {FinanceResult} Detailed cost breakdown, amortization schedule, and monthly data
 */
export function calculateFinance(params) {
  const {
    vehiclePrice,
    downPayment = 0,
    tradeIn = 0,
    apr = 0,
    termMonths = 60,
    extraMonthlyPayment = 0,
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

  // --- Loan amount ---
  const totalTax = round2(vehiclePrice * taxRate);
  const loanAmount = round2(
    Math.max(0, vehiclePrice + totalTax + fees - downPayment - tradeIn - taxIncentive)
  );

  // Upfront cost is the down payment (cash out of pocket)
  const upfrontCost = round2(downPayment);

  // --- Monthly payment calculation ---
  const r = apr / 12; // monthly interest rate
  let monthlyPayment;

  if (loanAmount === 0 || termMonths === 0) {
    // No loan or no term — no payment
    monthlyPayment = 0;
  } else if (apr === 0) {
    // 0% APR — simple division, no interest
    monthlyPayment = round2(loanAmount / termMonths);
  } else {
    // Standard amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    const compoundFactor = Math.pow(1 + r, termMonths);
    monthlyPayment = round2(
      loanAmount * (r * compoundFactor) / (compoundFactor - 1)
    );
  }

  // --- Depreciation schedule ---
  const depreciationSchedule = getDepreciationSchedule(
    vehiclePrice,
    comparisonMonths,
    isNew,
    startAgeMonths,
    isHybrid
  );

  // --- Build amortization / monthly schedule ---
  const monthlyInsurance = annualInsurance / 12;
  const monthlyMaintenance = annualMaintenance / 12;
  const monthlyFuel = annualFuelCost / 12;
  const monthlyOppRate = opportunityRate / 12;

  /** @type {FinanceMonthlyEntry[]} */
  const monthlyData = [];
  let balance = loanAmount;
  let cumulativePayments = 0;
  let cumulativeInterest = 0;
  let cumulativeRunning = 0;
  /** @type {number|null} */
  let payoffMonth = null;

  for (let m = 1; m <= comparisonMonths; m++) {
    let payment = 0;
    let interest = 0;
    let principal = 0;

    if (balance > 0) {
      interest = round2(balance * r);
      let totalPaymentThisMonth = monthlyPayment + extraMonthlyPayment;

      // Cap payment at remaining balance + interest (don't overpay)
      totalPaymentThisMonth = Math.min(totalPaymentThisMonth, balance + interest);
      totalPaymentThisMonth = round2(totalPaymentThisMonth);

      principal = round2(totalPaymentThisMonth - interest);
      balance = round2(Math.max(0, balance - principal));
      payment = totalPaymentThisMonth;

      if (balance === 0 && payoffMonth === null) {
        payoffMonth = m;
      }
    }
    // If balance is already 0, payment/interest/principal remain 0

    cumulativePayments += payment;
    cumulativeInterest += interest;
    cumulativeRunning += monthlyInsurance + monthlyMaintenance + monthlyFuel;

    const vehicleValue = round2(depreciationSchedule[m].value);
    const equity = round2(vehicleValue - balance);

    // Proportional opportunity cost on down payment at month m
    const oppCostAtM = downPayment * Math.pow(1 + monthlyOppRate, m) - downPayment;

    const cumulativeCost = round2(
      downPayment + cumulativePayments + oppCostAtM + cumulativeRunning - vehicleValue
    );

    monthlyData.push({
      month: m,
      payment: round2(payment),
      principal: round2(principal),
      interest: round2(interest),
      balance: round2(balance),
      equity,
      vehicleValue,
      cumulativeCost,
    });
  }

  // --- Summary totals ---
  const totalPayments = round2(cumulativePayments);
  const totalInterest = round2(cumulativeInterest);

  const opportunityCost = round2(
    downPayment * Math.pow(1 + monthlyOppRate, comparisonMonths) - downPayment
  );

  const years = comparisonMonths / 12;
  const totalFuelCost = round2(annualFuelCost * years);
  const totalInsurance = round2(annualInsurance * years);
  const totalMaintenance = round2(annualMaintenance * years);

  const vehicleValueAtEnd = round2(depreciationSchedule[comparisonMonths].value);
  const finalBalance = monthlyData.length > 0
    ? monthlyData[monthlyData.length - 1].balance
    : balance;
  const equityAtEnd = round2(vehicleValueAtEnd - finalBalance);

  const totalCost = round2(
    upfrontCost +
      totalPayments +
      opportunityCost +
      totalFuelCost +
      totalInsurance +
      totalMaintenance -
      vehicleValueAtEnd
  );

  const effectiveMonthlyCost = round2(
    comparisonMonths > 0 ? totalCost / comparisonMonths : 0
  );

  return {
    monthlyPayment,
    loanAmount,
    upfrontCost,
    totalPayments,
    totalInterest,
    totalCost,
    totalFuelCost,
    totalInsurance,
    totalMaintenance,
    vehicleValueAtEnd,
    equityAtEnd,
    effectiveMonthlyCost,
    payoffMonth,
    monthlyData,
  };
}
