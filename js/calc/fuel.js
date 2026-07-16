/**
 * Fuel cost and hybrid analysis calculation module.
 * Pure calculations — no DOM interaction.
 * All monetary results rounded to 2 decimal places.
 * @module calc/fuel
 */

/**
 * Rounds a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Sanitizes a numeric input, returning 0 for null, undefined, or NaN values.
 * @param {*} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function sanitize(value, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value);
}

/**
 * Calculates the annual fuel cost.
 *
 * Formula: (annualMiles / mpg) * gasPricePerGallon
 *
 * @param {number} annualMiles - Miles driven per year.
 * @param {number} mpg - Fuel efficiency in miles per gallon.
 * @param {number} gasPricePerGallon - Price of one gallon of gas in dollars.
 * @returns {number} Annual fuel cost in dollars, rounded to 2 decimal places.
 *   Returns Infinity if mpg is 0. Returns 0 for null/undefined inputs.
 */
export function calcAnnualFuelCost(annualMiles, mpg, gasPricePerGallon) {
  const miles = sanitize(annualMiles);
  const efficiency = sanitize(mpg);
  const price = sanitize(gasPricePerGallon);

  if (efficiency === 0) {
    return Infinity;
  }

  return round2((miles / efficiency) * price);
}

/**
 * Calculates total fuel cost over a given period.
 *
 * Formula: annualFuelCost * years
 *
 * @param {number} annualMiles - Miles driven per year.
 * @param {number} mpg - Fuel efficiency in miles per gallon.
 * @param {number} gasPricePerGallon - Price of one gallon of gas in dollars.
 * @param {number} years - Number of years for the period.
 * @returns {number} Total fuel cost in dollars, rounded to 2 decimal places.
 */
export function calcTotalFuelCost(annualMiles, mpg, gasPricePerGallon, years) {
  const annual = calcAnnualFuelCost(annualMiles, mpg, gasPricePerGallon);
  const yrs = sanitize(years);

  if (annual === Infinity) {
    return Infinity;
  }

  return round2(annual * yrs);
}

/**
 * Calculates annual fuel savings of a hybrid vehicle compared to a gas vehicle.
 *
 * Formula: annualFuelCost(gas) - annualFuelCost(hybrid)
 *
 * A positive result means the hybrid saves money. A negative result means
 * the hybrid costs more (e.g., if hybridMpg < gasMpg).
 *
 * @param {number} annualMiles - Miles driven per year.
 * @param {number} gasMpg - Fuel efficiency of the gas vehicle in mpg.
 * @param {number} hybridMpg - Fuel efficiency of the hybrid vehicle in mpg.
 * @param {number} gasPrice - Price of one gallon of gas in dollars.
 * @returns {number} Annual savings in dollars, rounded to 2 decimal places.
 *   Can be negative if the hybrid is less efficient.
 */
export function calcAnnualFuelSavings(annualMiles, gasMpg, hybridMpg, gasPrice) {
  const gasCost = calcAnnualFuelCost(annualMiles, gasMpg, gasPrice);
  const hybridCost = calcAnnualFuelCost(annualMiles, hybridMpg, gasPrice);

  if (gasCost === Infinity || hybridCost === Infinity) {
    return gasCost === hybridCost ? 0 : (gasCost === Infinity ? Infinity : -Infinity);
  }

  return round2(gasCost - hybridCost);
}

/**
 * Calculates the number of months to recoup a hybrid premium via fuel savings.
 *
 * Formula: (hybridPremium / annualFuelSavings) * 12
 *
 * @param {number} hybridPremium - Additional cost of the hybrid over the gas vehicle.
 * @param {number} annualFuelSavings - Annual fuel savings in dollars.
 * @returns {number} Months to break even.
 *   Returns Infinity if annualFuelSavings <= 0 (never recoups).
 *   Returns 0 if hybridPremium <= 0 (already ahead).
 */
export function calcBreakevenMonths(hybridPremium, annualFuelSavings) {
  const premium = sanitize(hybridPremium);
  const savings = sanitize(annualFuelSavings);

  if (premium <= 0) {
    return 0;
  }

  if (savings <= 0) {
    return Infinity;
  }

  return round2((premium / savings) * 12);
}

/**
 * Calculates breakeven months and annual savings across a range of annual mileage values.
 *
 * Useful for sensitivity analysis — understanding how driving habits affect
 * the financial case for a hybrid.
 *
 * @param {number} hybridPremium - Additional cost of the hybrid over the gas vehicle.
 * @param {number} gasMpg - Fuel efficiency of the gas vehicle in mpg.
 * @param {number} hybridMpg - Fuel efficiency of the hybrid vehicle in mpg.
 * @param {number} gasPrice - Price of one gallon of gas in dollars.
 * @param {number[]} [mileagePoints=[8000, 10000, 12000, 15000, 20000, 25000]] -
 *   Array of annual mileage values to evaluate.
 * @returns {Array<{miles: number, breakevenMonths: number, annualSavings: number}>}
 *   Array of results for each mileage point.
 */
export function calcMileageSensitivity(
  hybridPremium,
  gasMpg,
  hybridMpg,
  gasPrice,
  mileagePoints = [8000, 10000, 12000, 15000, 20000, 25000]
) {
  return mileagePoints.map((miles) => {
    const annualSavings = calcAnnualFuelSavings(miles, gasMpg, hybridMpg, gasPrice);
    const breakevenMonths = calcBreakevenMonths(hybridPremium, annualSavings);

    return {
      miles,
      breakevenMonths,
      annualSavings,
    };
  });
}

/**
 * Calculates breakeven months and annual savings across a range of gas price values.
 *
 * Useful for sensitivity analysis — understanding how gas price fluctuations
 * affect the financial case for a hybrid.
 *
 * @param {number} hybridPremium - Additional cost of the hybrid over the gas vehicle.
 * @param {number} gasMpg - Fuel efficiency of the gas vehicle in mpg.
 * @param {number} hybridMpg - Fuel efficiency of the hybrid vehicle in mpg.
 * @param {number} annualMiles - Miles driven per year.
 * @param {number[]} [pricePoints=[2.50, 3.00, 3.50, 4.00, 4.50, 5.00]] -
 *   Array of gas prices per gallon to evaluate.
 * @returns {Array<{gasPrice: number, breakevenMonths: number, annualSavings: number}>}
 *   Array of results for each gas price point.
 */
export function calcGasPriceSensitivity(
  hybridPremium,
  gasMpg,
  hybridMpg,
  annualMiles,
  pricePoints = [2.50, 3.00, 3.50, 4.00, 4.50, 5.00]
) {
  return pricePoints.map((gasPrice) => {
    const annualSavings = calcAnnualFuelSavings(annualMiles, gasMpg, hybridMpg, gasPrice);
    const breakevenMonths = calcBreakevenMonths(hybridPremium, annualSavings);

    return {
      gasPrice,
      breakevenMonths,
      annualSavings,
    };
  });
}

/**
 * Calculates cumulative fuel savings month-by-month, suitable for charting.
 *
 * For each month from 1 to totalMonths, cumulative savings = monthlySavings * month,
 * where monthlySavings = annualSavings / 12.
 *
 * @param {number} annualMiles - Miles driven per year.
 * @param {number} gasMpg - Fuel efficiency of the gas vehicle in mpg.
 * @param {number} hybridMpg - Fuel efficiency of the hybrid vehicle in mpg.
 * @param {number} gasPrice - Price of one gallon of gas in dollars.
 * @param {number} totalMonths - Total number of months to project.
 * @returns {Array<{month: number, cumulativeSavings: number}>}
 *   Array of monthly cumulative savings data points.
 */
export function calcCumulativeFuelSavings(annualMiles, gasMpg, hybridMpg, gasPrice, totalMonths) {
  const annualSavings = calcAnnualFuelSavings(annualMiles, gasMpg, hybridMpg, gasPrice);
  const monthlySavings = annualSavings / 12;
  const months = sanitize(totalMonths);
  const results = [];

  for (let month = 1; month <= months; month++) {
    results.push({
      month,
      cumulativeSavings: round2(monthlySavings * month),
    });
  }

  return results;
}
