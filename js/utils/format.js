/**
 * Utility formatting functions for the car finance calculator.
 * Pure calculation module — no DOM interaction.
 * @module utils/format
 */

const DASH = "\u2014"; // em-dash for invalid values

/**
 * Check if a value is a valid, finite number.
 * @param {*} n
 * @returns {boolean}
 */
function isValid(n) {
  return n !== null && n !== undefined && typeof n === "number" && Number.isFinite(n);
}

/** @type {Intl.NumberFormat} */
const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** @type {Intl.NumberFormat} */
const currencyExactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** @type {Intl.NumberFormat} */
const currencyNoCentsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** @type {Intl.NumberFormat} */
const currencyCentsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as currency.
 * Amounts >= $1 display without cents ("$12,345").
 * Amounts < $1 display with cents ("$0.75").
 * @param {number} n - The amount to format.
 * @returns {string} Formatted currency string, or "—" for invalid input.
 */
export function formatCurrency(n) {
  if (!isValid(n)) return DASH;
  if (Math.abs(n) >= 1) {
    return currencyNoCentsFormatter.format(n);
  }
  return currencyCentsFormatter.format(n);
}

/**
 * Format a number as currency with exactly 2 decimal places.
 * Always shows cents ("$12,345.67").
 * @param {number} n - The amount to format.
 * @returns {string} Formatted currency string, or "—" for invalid input.
 */
export function formatCurrencyExact(n) {
  if (!isValid(n)) return DASH;
  return currencyExactFormatter.format(n);
}

/**
 * Format a decimal value as a percentage with 2 decimal places.
 * Input is a decimal (e.g. 0.065 → "6.50%").
 * @param {number} n - The decimal value (0.065 = 6.5%).
 * @returns {string} Formatted percentage string, or "—" for invalid input.
 */
export function formatPercent(n) {
  if (!isValid(n)) return DASH;
  return (n * 100).toFixed(2) + "%";
}

/**
 * Format a number as a comma-separated integer.
 * @param {number} n - The number to format.
 * @returns {string} Formatted number string, or "—" for invalid input.
 */
export function formatNumber(n) {
  if (!isValid(n)) return DASH;
  return integerFormatter.format(Math.round(n));
}

/**
 * Format a number as MPG (miles per gallon), rounded to the nearest integer.
 * @param {number} n - The MPG value.
 * @returns {string} Formatted MPG string (e.g. "28 MPG"), or "—" for invalid input.
 */
export function formatMPG(n) {
  if (!isValid(n)) return DASH;
  return Math.round(n) + " MPG";
}

/**
 * Format a number of months as a human-readable duration.
 * If evenly divisible by 12, displays as years (e.g. "3 years").
 * Otherwise displays as months (e.g. "36 months").
 * @param {number} n - The number of months.
 * @returns {string} Formatted duration string, or "—" for invalid input.
 */
export function formatMonths(n) {
  if (!isValid(n)) return DASH;
  const months = Math.round(n);
  if (months > 0 && months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return months === 1 ? "1 month" : `${months} months`;
}
