/**
 * Vehicle depreciation calculation module.
 * Pure calculation module — no DOM interaction.
 *
 * Depreciation curve:
 *   - Year 1:  20% annual depreciation
 *   - Years 2–5: 15% annual depreciation
 *   - Years 6+: 10% annual depreciation
 *
 * Hybrid adjustment: reduces the annual depreciation rate by 2 percentage points
 * (e.g. year 1 becomes 18% instead of 20%).
 *
 * Used cars enter the curve at `startAgeMonths`, meaning the car is already
 * that many months old when purchased. The depreciation rate applied each month
 * is based on the car's total age (startAgeMonths + monthsOwned).
 *
 * @module calc/depreciation
 */

/**
 * Get the annual depreciation rate for a given year of the car's life.
 * Year 1 = months 0–11, Year 2 = months 12–23, etc.
 * @param {number} totalAgeMonths - The car's total age in months (0-indexed).
 * @param {boolean} isHybrid - Whether the vehicle is a hybrid (retains 2% more value/year).
 * @returns {number} The annual depreciation rate as a decimal (e.g. 0.20).
 */
function getAnnualRate(totalAgeMonths, isHybrid) {
  // Determine which year of life the car is in (1-indexed)
  const yearOfLife = Math.floor(totalAgeMonths / 12) + 1;

  let rate;
  if (yearOfLife <= 1) {
    rate = 0.20;
  } else if (yearOfLife <= 5) {
    rate = 0.15;
  } else {
    rate = 0.10;
  }

  // Hybrid adjustment: reduce depreciation rate by 2 percentage points
  if (isHybrid) {
    rate = Math.max(0, rate - 0.02);
  }

  return rate;
}

/**
 * Get the monthly depreciation multiplier for a given month of the car's total age.
 * The multiplier is applied as: value * (1 - annualRate / 12).
 * @param {number} totalAgeMonths - The car's total age in months at this point.
 * @param {boolean} isHybrid - Whether the vehicle is a hybrid.
 * @returns {number} The monthly retention multiplier (e.g. ~0.9833 for 20% annual).
 */
function getMonthlyMultiplier(totalAgeMonths, isHybrid) {
  const annualRate = getAnnualRate(totalAgeMonths, isHybrid);
  return 1 - annualRate / 12;
}

/**
 * Calculate the vehicle's value after a given number of months of ownership.
 *
 * @param {number} originalPrice - The purchase price of the vehicle.
 * @param {number} monthsOwned - Number of months the vehicle has been owned.
 * @param {boolean} isNew - Whether the vehicle was purchased new.
 * @param {number} [startAgeMonths=0] - For used cars, how old the car was (in months)
 *   at the time of purchase. Ignored for new cars.
 * @param {boolean} [isHybrid=false] - Whether the vehicle is a hybrid (retains more value).
 * @returns {number} The estimated vehicle value, or 0 for invalid inputs.
 *
 * @example
 * // New car worth $30,000 after 12 months
 * getVehicleValue(30000, 12, true); // ~$24,000
 *
 * @example
 * // Used car purchased for $20,000, was 24 months old, after 12 more months
 * getVehicleValue(20000, 12, false, 24); // value using year-3 depreciation rates
 */
export function getVehicleValue(originalPrice, monthsOwned, isNew, startAgeMonths = 0, isHybrid = false) {
  // Edge cases
  if (originalPrice == null || !Number.isFinite(originalPrice) || originalPrice <= 0) {
    return 0;
  }
  if (monthsOwned == null || !Number.isFinite(monthsOwned) || monthsOwned < 0) {
    return originalPrice;
  }

  const baseAge = isNew ? 0 : Math.max(0, startAgeMonths);
  let value = originalPrice;

  for (let m = 0; m < monthsOwned; m++) {
    const totalAge = baseAge + m;
    value *= getMonthlyMultiplier(totalAge, isHybrid);
  }

  // Prevent floating-point drift below zero
  return Math.max(0, value);
}

/**
 * Generate a month-by-month depreciation schedule for a vehicle.
 *
 * @param {number} originalPrice - The purchase price of the vehicle.
 * @param {number} totalMonths - The total number of months to calculate (schedule runs from month 0 to totalMonths, inclusive).
 * @param {boolean} isNew - Whether the vehicle was purchased new.
 * @param {number} [startAgeMonths=0] - For used cars, how old the car was (in months)
 *   at the time of purchase. Ignored for new cars.
 * @param {boolean} [isHybrid=false] - Whether the vehicle is a hybrid.
 * @returns {Array<{month: number, value: number, depreciationThisMonth: number, totalDepreciation: number}>}
 *   Array of monthly entries from month 0 to totalMonths.
 *
 * @example
 * const schedule = getDepreciationSchedule(30000, 60, true);
 * // schedule[0] = { month: 0, value: 30000, depreciationThisMonth: 0, totalDepreciation: 0 }
 * // schedule[1] = { month: 1, value: ~29500, depreciationThisMonth: ~500, totalDepreciation: ~500 }
 */
export function getDepreciationSchedule(originalPrice, totalMonths, isNew, startAgeMonths = 0, isHybrid = false) {
  // Edge cases
  if (originalPrice == null || !Number.isFinite(originalPrice) || originalPrice <= 0) {
    return [{ month: 0, value: 0, depreciationThisMonth: 0, totalDepreciation: 0 }];
  }
  if (totalMonths == null || !Number.isFinite(totalMonths) || totalMonths < 0) {
    return [{ month: 0, value: originalPrice, depreciationThisMonth: 0, totalDepreciation: 0 }];
  }

  const months = Math.floor(totalMonths);
  const baseAge = isNew ? 0 : Math.max(0, startAgeMonths);
  const schedule = [];

  let value = originalPrice;

  // Month 0: no depreciation yet
  schedule.push({
    month: 0,
    value: originalPrice,
    depreciationThisMonth: 0,
    totalDepreciation: 0,
  });

  for (let m = 1; m <= months; m++) {
    const totalAge = baseAge + (m - 1); // age at the start of this month
    const prevValue = value;
    value *= getMonthlyMultiplier(totalAge, isHybrid);
    value = Math.max(0, value);

    const depreciationThisMonth = prevValue - value;
    const totalDepreciation = originalPrice - value;

    schedule.push({
      month: m,
      value,
      depreciationThisMonth,
      totalDepreciation,
    });
  }

  return schedule;
}
