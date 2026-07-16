/**
 * Main application entry point.
 * Wires up UI, runs calculations, updates results & charts, and handles theme/sharing actions.
 * @module main
 */

import { initInputs, getInputs, setInputs, onChange } from "./ui/inputs.js";
import { initResults, updateResults } from "./ui/results.js";
import { updateCharts } from "./ui/charts.js";
import { initTooltips } from "./ui/tooltips.js";
import { decodeParams, getShareURL } from "./utils/storage.js";

// Calculators
import { calculateCash } from "./calc/cash.js";
import { calculateFinance } from "./calc/finance.js";
import { calculateLease } from "./calc/lease.js";
import {
  calcAnnualFuelCost,
  calcAnnualFuelSavings,
  calcBreakevenMonths,
  calcMileageSensitivity,
  calcGasPriceSensitivity,
} from "./calc/fuel.js";
import { compareAll } from "./calc/compare.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize UI modules
  initInputs();
  initResults();
  initTooltips();

  // 2. Load shared state from URL query params (if any)
  const sharedState = decodeParams();
  if (Object.keys(sharedState).length > 0) {
    setInputs(sharedState);
  }

  // 3. Register input change callback to recalculate everything
  onChange(recalculate);

  // 4. Bind theme, share, and print buttons
  initGlobalActions();

  // 5. Initial calculation run
  recalculate();
});

/**
 * Main calculation orchestration. Gathers inputs, runs model engines, and triggers redraws.
 */
function recalculate() {
  const inputs = getInputs();

  // A. Calculate fuel metrics
  const premium = inputs.priceHybrid - inputs.priceGas;
  const annualSavings = calcAnnualFuelSavings(inputs.annualMiles, inputs.mpgGas, inputs.mpgHybrid, inputs.gasPrice);
  const breakevenMonths = calcBreakevenMonths(premium, annualSavings);
  
  const fuelAnalysis = {
    annualFuelCostGas: calcAnnualFuelCost(inputs.annualMiles, inputs.mpgGas, inputs.gasPrice),
    annualFuelCostHybrid: calcAnnualFuelCost(inputs.annualMiles, inputs.mpgHybrid, inputs.gasPrice),
    annualSavings: annualSavings,
    breakevenMonths: breakevenMonths,
    miles: inputs.annualMiles,
    gasPrice: inputs.gasPrice,
    hybridPremium: premium,
    mileageSensitivity: calcMileageSensitivity(premium, inputs.mpgGas, inputs.mpgHybrid, inputs.gasPrice),
    gasPriceSensitivity: calcGasPriceSensitivity(premium, inputs.mpgGas, inputs.mpgHybrid, inputs.annualMiles)
  };

  // B. Run acquisition models for Gasoline
  const cashGas = calculateCash({
    vehiclePrice: inputs.priceGas,
    taxRate: inputs.taxRate,
    fees: inputs.fees,
    annualInsurance: inputs.insurance,
    annualMaintenance: inputs.maintGas,
    annualFuelCost: fuelAnalysis.annualFuelCostGas,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    startAgeMonths: inputs.usedAge * 12,
    isHybrid: false,
    taxIncentive: 0
  });

  const financeGas = calculateFinance({
    vehiclePrice: inputs.priceGas,
    downPayment: inputs.downPayment,
    tradeIn: inputs.tradeIn,
    apr: inputs.apr,
    termMonths: inputs.loanTerm,
    extraMonthlyPayment: inputs.extraPayment,
    taxRate: inputs.taxRate,
    fees: inputs.fees + inputs.gapInsurance,
    annualInsurance: inputs.insurance,
    annualMaintenance: inputs.maintGas,
    annualFuelCost: fuelAnalysis.annualFuelCostGas,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    startAgeMonths: inputs.usedAge * 12,
    isHybrid: false,
    taxIncentive: 0
  });

  const leaseGas = calculateLease({
    vehiclePrice: inputs.priceGas,
    downPayment: inputs.downPayment,
    monthlyPayment: inputs.leasePayGas,
    leaseTerm: inputs.leaseTerm,
    residualPercent: inputs.residual,
    moneyFactor: inputs.moneyFactor,
    mileageAllowance: inputs.leaseAllowed,
    excessMileageRate: inputs.leaseExcessRate,
    expectedAnnualMiles: inputs.annualMiles,
    acquisitionFee: inputs.leaseAcqFee,
    dispositionFee: inputs.leaseDispFee,
    buyAtEnd: inputs.leaseBuyout,
    taxRate: inputs.taxRate,
    annualInsurance: inputs.insurance,
    annualMaintenance: inputs.maintGas,
    annualFuelCost: fuelAnalysis.annualFuelCostGas,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    isHybrid: false,
    taxIncentive: 0
  });

  // C. Run acquisition models for Hybrid
  const cashHybrid = calculateCash({
    vehiclePrice: inputs.priceHybrid,
    taxRate: inputs.taxRate,
    fees: inputs.fees,
    annualInsurance: inputs.insurance * (1 + inputs.hybridInsurancePremium),
    annualMaintenance: inputs.maintHybrid,
    annualFuelCost: fuelAnalysis.annualFuelCostHybrid,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    startAgeMonths: inputs.usedAge * 12,
    isHybrid: true,
    taxIncentive: inputs.hybridTaxIncentive
  });

  const financeHybrid = calculateFinance({
    vehiclePrice: inputs.priceHybrid,
    downPayment: inputs.downPayment,
    tradeIn: inputs.tradeIn,
    apr: inputs.apr,
    termMonths: inputs.loanTerm,
    extraMonthlyPayment: inputs.extraPayment,
    taxRate: inputs.taxRate,
    fees: inputs.fees + inputs.gapInsurance,
    annualInsurance: inputs.insurance * (1 + inputs.hybridInsurancePremium),
    annualMaintenance: inputs.maintHybrid,
    annualFuelCost: fuelAnalysis.annualFuelCostHybrid,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    startAgeMonths: inputs.usedAge * 12,
    isHybrid: true,
    taxIncentive: inputs.hybridTaxIncentive
  });

  const leaseHybrid = calculateLease({
    vehiclePrice: inputs.priceHybrid,
    downPayment: inputs.downPayment,
    monthlyPayment: inputs.leasePayHybrid,
    leaseTerm: inputs.leaseTerm,
    residualPercent: inputs.residual,
    moneyFactor: inputs.moneyFactor,
    mileageAllowance: inputs.leaseAllowed,
    excessMileageRate: inputs.leaseExcessRate,
    expectedAnnualMiles: inputs.annualMiles,
    acquisitionFee: inputs.leaseAcqFee,
    dispositionFee: inputs.leaseDispFee,
    buyAtEnd: inputs.leaseBuyout,
    taxRate: inputs.taxRate,
    annualInsurance: inputs.insurance * (1 + inputs.hybridInsurancePremium),
    annualMaintenance: inputs.maintHybrid,
    annualFuelCost: fuelAnalysis.annualFuelCostHybrid,
    opportunityRate: inputs.opportunityRate,
    comparisonMonths: inputs.periodYears * 12,
    isNew: inputs.condition === "new",
    isHybrid: true,
    taxIncentive: inputs.hybridTaxIncentive
  });

  // Assign helper reference tags for details formatting
  cashGas.method = "cash"; cashGas.fuelType = "gas"; cashGas.comparisonMonths = inputs.periodYears * 12;
  cashHybrid.method = "cash"; cashHybrid.fuelType = "hybrid"; cashHybrid.comparisonMonths = inputs.periodYears * 12;
  financeGas.method = "finance"; financeGas.fuelType = "gas"; financeGas.comparisonMonths = inputs.periodYears * 12;
  financeHybrid.method = "finance"; financeHybrid.fuelType = "hybrid"; financeHybrid.comparisonMonths = inputs.periodYears * 12;
  leaseGas.method = "lease"; leaseGas.fuelType = "gas"; leaseGas.comparisonMonths = inputs.periodYears * 12;
  leaseHybrid.method = "lease"; leaseHybrid.fuelType = "hybrid"; leaseHybrid.comparisonMonths = inputs.periodYears * 12;

  // D. Run comparison logic
  const comparison = compareAll(
    cashGas,
    cashHybrid,
    financeGas,
    financeHybrid,
    leaseGas,
    leaseHybrid,
    fuelAnalysis
  );

  const viewData = {
    cashGas,
    cashHybrid,
    financeGas,
    financeHybrid,
    leaseGas,
    leaseHybrid,
    fuelAnalysis,
    comparison,
    // Winners references for cost breakdown donuts
    gasWinnerData: findWinnerForFuel(comparison, [cashGas, financeGas, leaseGas], "gas"),
    hybridWinnerData: findWinnerForFuel(comparison, [cashHybrid, financeHybrid, leaseHybrid], "hybrid")
  };

  // E. Redraw results and update canvas charts
  updateResults(viewData);
  updateCharts(viewData);
}

/**
 * Finds the top scoring/cheapest option in the rankings for a specific fuel type.
 */
function findWinnerForFuel(comparison, options, fuelType) {
  const fuelRankings = comparison.rankings.byTotalCost.filter(r => r.fuelType === fuelType);
  if (fuelRankings.length === 0) return options[0];
  const topMethod = fuelRankings[0].method;
  return options.find(o => o.method === topMethod) || options[0];
}

/**
 * Wire up global actions (theme toggling, print layout, copy share link).
 */
function initGlobalActions() {
  // Theme Toggler
  const toggleBtn = document.getElementById("theme-toggle");
  const toggleIcon = document.getElementById("theme-toggle-icon");

  toggleBtn.addEventListener("click", () => {
    // Add transition guard class to body to prevent flash
    document.body.classList.add("theme-transitioning");

    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    toggleIcon.textContent = newTheme === "light" ? "🌙" : "☀️";
    
    // Save to local storage
    localStorage.setItem("theme", newTheme);

    // Re-draw charts with updated gridline and font colors
    recalculate();

    setTimeout(() => {
      document.body.classList.remove("theme-transitioning");
    }, 350);
  });

  // Load saved theme preference
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  toggleIcon.textContent = savedTheme === "light" ? "🌙" : "☀️";

  // Share Button
  const shareBtn = document.getElementById("btn-share");
  shareBtn.addEventListener("click", () => {
    const inputs = getInputs();
    const shareURL = getShareURL(inputs);
    
    navigator.clipboard.writeText(shareURL)
      .then(() => {
        const originalText = shareBtn.textContent;
        shareBtn.textContent = "✅ Link Copied!";
        shareBtn.style.background = "var(--success)";
        shareBtn.style.color = "#ffffff";

        setTimeout(() => {
          shareBtn.textContent = originalText;
          shareBtn.style.background = "";
          shareBtn.style.color = "";
        }, 2000);
      })
      .catch(err => {
        console.error("Could not copy share URL: ", err);
        alert("Failed to copy link. Share URL is: " + shareURL);
      });
  });

  // Print Button
  const printBtn = document.getElementById("btn-print");
  printBtn.addEventListener("click", () => {
    window.print();
  });
}
