/**
 * Input elements state management, validation, presets, and events.
 * Handles DOM element bindings, change notifications, and presets loading.
 * @module ui/inputs
 */

import { formatCurrency, formatNumber } from "../utils/format.js";

// List of input element IDs we care about
const INPUT_IDS = {
  condition: "cond-new", // radio group vehicle-condition
  priceGas: "input-price-gas",
  priceHybrid: "input-price-hybrid",
  usedAge: "input-used-age",
  usedMileage: "input-used-mileage",
  annualMiles: "input-annual-miles",
  gasPrice: "input-gas-price",
  mpgGas: "input-mpg-gas",
  mpgHybrid: "input-mpg-hybrid",
  downPayment: "input-down-payment",
  tradeIn: "input-trade-in",
  taxRate: "input-tax-rate",
  fees: "input-fees",
  insurance: "input-insurance",
  opportunityRate: "input-opportunity-rate",
  periodYears: "input-period-years",
  loanTerm: "select-loan-term",
  apr: "input-apr",
  extraPayment: "input-extra-payment",
  leaseTerm: "select-lease-term",
  leasePayGas: "input-lease-pay-gas",
  leasePayHybrid: "input-lease-pay-hybrid",
  residual: "input-residual",
  moneyFactor: "input-money-factor",
  leaseAllowed: "input-lease-miles-allowed",
  leaseExcessRate: "input-lease-excess-rate",
  leaseAcqFee: "input-lease-acq-fee",
  leaseDispFee: "input-lease-disp-fee",
  leaseBuyout: "lease-buyout-no", // radio group lease-buyout
  maintGas: "input-maint-gas",
  maintHybrid: "input-maint-hybrid",
  batteryCost: "input-battery-cost",
  batteryWarranty: "input-battery-warranty",
  hybridDeprAdj: "input-hybrid-depr-adj",
  hybridTaxIncentive: "input-hybrid-tax-incentive",
  hybridInsurancePremium: "input-hybrid-insurance-premium",
  gapInsurance: "input-gap-insurance",
};

// Define Preset configurations
export const PRESETS = {
  economy: {
    condition: "new",
    priceGas: 28000,
    priceHybrid: 30500,
    annualMiles: 12000,
    gasPrice: 3.50,
    mpgGas: 32,
    mpgHybrid: 52,
    downPayment: 3000,
    tradeIn: 0,
    taxRate: 7.0,
    fees: 400,
    insurance: 1300,
    opportunityRate: 7.0,
    periodYears: 5,
    loanTerm: 60,
    apr: 6.9,
    extraPayment: 0,
    leaseTerm: 36,
    leasePayGas: 330,
    leasePayHybrid: 360,
    residual: 56.0,
    moneyFactor: 0.0028,
    leaseAllowed: 12000,
    leaseExcessRate: 0.25,
    leaseAcqFee: 795,
    leaseDispFee: 350,
    leaseBuyout: "no",
    maintGas: 450,
    maintHybrid: 350,
    batteryCost: 3500,
    batteryWarranty: 8,
    hybridDeprAdj: 2.0,
    hybridTaxIncentive: 0,
    hybridInsurancePremium: 4.0,
    gapInsurance: 0,
  },
  suv: {
    condition: "new",
    priceGas: 42000,
    priceHybrid: 46000,
    annualMiles: 12000,
    gasPrice: 3.50,
    mpgGas: 26,
    mpgHybrid: 37,
    downPayment: 5000,
    tradeIn: 0,
    taxRate: 7.0,
    fees: 500,
    insurance: 1500,
    opportunityRate: 7.0,
    periodYears: 5,
    loanTerm: 60,
    apr: 6.5,
    extraPayment: 0,
    leaseTerm: 36,
    leasePayGas: 480,
    leasePayHybrid: 520,
    residual: 55.0,
    moneyFactor: 0.0027,
    leaseAllowed: 12000,
    leaseExcessRate: 0.25,
    leaseAcqFee: 895,
    leaseDispFee: 350,
    leaseBuyout: "no",
    maintGas: 550,
    maintHybrid: 450,
    batteryCost: 3800,
    batteryWarranty: 8,
    hybridDeprAdj: 2.0,
    hybridTaxIncentive: 0,
    hybridInsurancePremium: 5.0,
    gapInsurance: 0,
  },
  luxury: {
    condition: "new",
    priceGas: 65000,
    priceHybrid: 70000,
    annualMiles: 12000,
    gasPrice: 3.50,
    mpgGas: 22,
    mpgHybrid: 30,
    downPayment: 8000,
    tradeIn: 0,
    taxRate: 7.0,
    fees: 700,
    insurance: 2200,
    opportunityRate: 7.0,
    periodYears: 5,
    loanTerm: 48,
    apr: 5.9,
    extraPayment: 0,
    leaseTerm: 36,
    leasePayGas: 750,
    leasePayHybrid: 810,
    residual: 53.0,
    moneyFactor: 0.0025,
    leaseAllowed: 12000,
    leaseExcessRate: 0.30,
    leaseAcqFee: 995,
    leaseDispFee: 400,
    leaseBuyout: "no",
    maintGas: 800,
    maintHybrid: 650,
    batteryCost: 4500,
    batteryWarranty: 8,
    hybridDeprAdj: 2.5,
    hybridTaxIncentive: 0,
    hybridInsurancePremium: 6.0,
    gapInsurance: 0,
  },
  used: {
    condition: "used",
    priceGas: 18000,
    priceHybrid: 21000,
    usedAge: 3,
    usedMileage: 36000,
    annualMiles: 12000,
    gasPrice: 3.50,
    mpgGas: 30,
    mpgHybrid: 48,
    downPayment: 2500,
    tradeIn: 0,
    taxRate: 7.0,
    fees: 300,
    insurance: 1400,
    opportunityRate: 7.0,
    periodYears: 4,
    loanTerm: 48,
    apr: 7.9,
    extraPayment: 0,
    leaseTerm: 36,
    leasePayGas: 280, // lease rates are generally theoretical for used but we fill them
    leasePayHybrid: 320,
    residual: 42.0,
    moneyFactor: 0.0035,
    leaseAllowed: 12000,
    leaseExcessRate: 0.25,
    leaseAcqFee: 795,
    leaseDispFee: 350,
    leaseBuyout: "no",
    maintGas: 1000,
    maintHybrid: 850,
    batteryCost: 3500,
    batteryWarranty: 5, // less warranty remaining
    hybridDeprAdj: 1.5,
    hybridTaxIncentive: 0,
    hybridInsurancePremium: 3.0,
    gapInsurance: 0,
  },
  highmileage: {
    condition: "new",
    priceGas: 42000,
    priceHybrid: 46000,
    annualMiles: 25000, // HIGH MILEAGE
    gasPrice: 3.80,     // Slightly higher gas
    mpgGas: 26,
    mpgHybrid: 37,
    downPayment: 5000,
    tradeIn: 0,
    taxRate: 7.0,
    fees: 500,
    insurance: 1500,
    opportunityRate: 7.0,
    periodYears: 5,
    loanTerm: 60,
    apr: 6.5,
    extraPayment: 0,
    leaseTerm: 36,
    leasePayGas: 480,
    leasePayHybrid: 520,
    residual: 55.0,
    moneyFactor: 0.0027,
    leaseAllowed: 15000,
    leaseExcessRate: 0.25,
    leaseAcqFee: 895,
    leaseDispFee: 350,
    leaseBuyout: "no",
    maintGas: 550,
    maintHybrid: 450,
    batteryCost: 3800,
    batteryWarranty: 8,
    hybridDeprAdj: 2.0,
    hybridTaxIncentive: 0,
    hybridInsurancePremium: 5.0,
    gapInsurance: 0,
  },
};

let changeCallback = () => {};

/**
 * Register a callback for input change events.
 * @param {Function} cb
 */
export function onChange(cb) {
  changeCallback = cb;
}

/**
 * Initialize all input event listeners and validation.
 */
export function initInputs() {
  // Bind inputs panel change events
  const inputsPanel = document.getElementById("inputs-panel");
  inputsPanel.addEventListener("input", handleInputChange);
  inputsPanel.addEventListener("change", handleInputChange);

  // Setup collapsible section triggers
  const advTrigger = document.getElementById("collapsible-advanced-trigger");
  const advContent = document.getElementById("collapsible-advanced-content");
  const advSection = document.getElementById("collapsible-advanced");
  
  advTrigger.addEventListener("click", () => {
    const isExpanded = advTrigger.getAttribute("aria-expanded") === "true";
    advTrigger.setAttribute("aria-expanded", !isExpanded);
    advSection.classList.toggle("is-open");
  });

  // Slider label updates
  const sliderPeriod = document.getElementById("input-period-years");
  const sliderLabel = document.getElementById("slider-period-val");
  sliderPeriod.addEventListener("input", () => {
    sliderLabel.textContent = `${sliderPeriod.value} years`;
  });

  // Condition toggles update
  document.querySelectorAll('input[name="vehicle-condition"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const usedSpecs = document.getElementById("used-specs-container");
      if (e.target.value === "used") {
        usedSpecs.style.display = "flex";
      } else {
        usedSpecs.style.display = "none";
      }
    });
  });

  // Wire up preset buttons
  document.getElementById("preset-economy").addEventListener("click", () => loadPreset("economy"));
  document.getElementById("preset-suv").addEventListener("click", () => loadPreset("suv"));
  document.getElementById("preset-luxury").addEventListener("click", () => loadPreset("luxury"));
  document.getElementById("preset-used").addEventListener("click", () => loadPreset("used"));
  document.getElementById("preset-highmileage").addEventListener("click", () => loadPreset("highmileage"));
}

/**
 * Handle input modifications. Updates previews, does validation, and triggers callback.
 */
function handleInputChange(e) {
  // Auto-fill hybrid price premium indicator
  updateHybridPricePremium();
  
  // Update live fuel cost previews in input groups
  updateFuelCostPreviews();

  // Validate current inputs
  validateInputs();

  // Notify listeners
  changeCallback();
}

/**
 * Update the premium labels in the UI.
 */
function updateHybridPricePremium() {
  const priceGas = Number(document.getElementById("input-price-gas").value) || 0;
  const priceHybrid = Number(document.getElementById("input-price-hybrid").value) || 0;
  const premiumLabel = document.getElementById("hybrid-premium-label");
  const diff = priceHybrid - priceGas;

  if (diff > 0) {
    premiumLabel.textContent = `+${formatCurrency(diff)} hybrid premium`;
    premiumLabel.style.color = "var(--hybrid-text)";
  } else if (diff < 0) {
    premiumLabel.textContent = `-${formatCurrency(Math.abs(diff))} hybrid savings`;
    premiumLabel.style.color = "var(--gas-text)";
  } else {
    premiumLabel.textContent = "No hybrid price premium";
    premiumLabel.style.color = "var(--text-muted)";
  }
}

/**
 * Calculate and display instant fuel cost previews under the MPG fields.
 */
function updateFuelCostPreviews() {
  const miles = Number(document.getElementById("input-annual-miles").value) || 0;
  const price = Number(document.getElementById("input-gas-price").value) || 0;
  const mpgGas = Number(document.getElementById("input-mpg-gas").value) || 1;
  const mpgHybrid = Number(document.getElementById("input-mpg-hybrid").value) || 1;

  const costGas = (miles / mpgGas) * price;
  const costHybrid = (miles / mpgHybrid) * price;

  document.getElementById("preview-fuel-cost-gas").textContent = formatCurrency(costGas);
  document.getElementById("preview-fuel-cost-hybrid").textContent = formatCurrency(costHybrid);
}

/**
 * Apply validation rules to the input elements.
 */
function validateInputs() {
  // Simple check for negative numbers and logical thresholds
  const numericInputs = document.querySelectorAll('.input-text[type="number"]');
  numericInputs.forEach((input) => {
    const val = Number(input.value);
    const min = Number(input.getAttribute("min"));
    const max = Number(input.getAttribute("max"));

    let isValid = true;
    if (input.value === "" || isNaN(val)) {
      isValid = false;
    } else if (min !== null && val < min) {
      isValid = false;
    } else if (max !== null && input.hasAttribute("max") && val > max) {
      isValid = false;
    }

    if (!isValid) {
      input.classList.add("is-invalid");
    } else {
      input.classList.remove("is-invalid");
    }
  });
}

/**
 * Gathers the current values of all inputs from the DOM.
 * @returns {Object} Map of input key names to their parsed values.
 */
export function getInputs() {
  const isNew = document.querySelector('input[name="vehicle-condition"]:checked').value === "new";
  const leaseBuyout = document.querySelector('input[name="lease-buyout"]:checked').value === "yes";

  return {
    condition: isNew ? "new" : "used",
    priceGas: Number(document.getElementById("input-price-gas").value) || 0,
    priceHybrid: Number(document.getElementById("input-price-hybrid").value) || 0,
    usedAge: isNew ? 0 : (Number(document.getElementById("input-used-age").value) || 0),
    usedMileage: isNew ? 0 : (Number(document.getElementById("input-used-mileage").value) || 0),
    annualMiles: Number(document.getElementById("input-annual-miles").value) || 0,
    gasPrice: Number(document.getElementById("input-gas-price").value) || 0,
    mpgGas: Number(document.getElementById("input-mpg-gas").value) || 1,
    mpgHybrid: Number(document.getElementById("input-mpg-hybrid").value) || 1,
    downPayment: Number(document.getElementById("input-down-payment").value) || 0,
    tradeIn: Number(document.getElementById("input-trade-in").value) || 0,
    taxRate: (Number(document.getElementById("input-tax-rate").value) || 0) / 100, // as decimal
    fees: Number(document.getElementById("input-fees").value) || 0,
    insurance: Number(document.getElementById("input-insurance").value) || 0,
    opportunityRate: (Number(document.getElementById("input-opportunity-rate").value) || 0) / 100, // as decimal
    periodYears: Number(document.getElementById("input-period-years").value) || 5,
    loanTerm: Number(document.getElementById("select-loan-term").value) || 60,
    apr: (Number(document.getElementById("input-apr").value) || 0) / 100, // as decimal
    extraPayment: Number(document.getElementById("input-extra-payment").value) || 0,
    leaseTerm: Number(document.getElementById("select-lease-term").value) || 36,
    leasePayGas: Number(document.getElementById("input-lease-pay-gas").value) || 0,
    leasePayHybrid: Number(document.getElementById("input-lease-pay-hybrid").value) || 0,
    residual: (Number(document.getElementById("input-residual").value) || 0) / 100, // as decimal
    moneyFactor: Number(document.getElementById("input-money-factor").value) || 0.002,
    leaseAllowed: Number(document.getElementById("input-lease-miles-allowed").value) || 0,
    leaseExcessRate: Number(document.getElementById("input-lease-excess-rate").value) || 0,
    leaseAcqFee: Number(document.getElementById("input-lease-acq-fee").value) || 0,
    leaseDispFee: Number(document.getElementById("input-lease-disp-fee").value) || 0,
    leaseBuyout: leaseBuyout,
    maintGas: Number(document.getElementById("input-maint-gas").value) || 0,
    maintHybrid: Number(document.getElementById("input-maint-hybrid").value) || 0,
    batteryCost: Number(document.getElementById("input-battery-cost").value) || 0,
    batteryWarranty: Number(document.getElementById("input-battery-warranty").value) || 0,
    hybridDeprAdj: (Number(document.getElementById("input-hybrid-depr-adj").value) || 0) / 100, // as decimal
    hybridTaxIncentive: Number(document.getElementById("input-hybrid-tax-incentive").value) || 0,
    hybridInsurancePremium: (Number(document.getElementById("input-hybrid-insurance-premium").value) || 0) / 100, // as decimal
    gapInsurance: Number(document.getElementById("input-gap-insurance").value) || 0,
  };
}

/**
 * Restores input elements to specific states (presets or shared URL state).
 * @param {Object} data - Input settings.
 */
export function setInputs(data) {
  if (!data) return;

  // Set condition radio
  if (data.condition) {
    const radio = document.getElementById(data.condition === "new" ? "cond-new" : "cond-used");
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change"));
    }
  }

  // Set lease buyout radio
  if (data.leaseBuyout !== undefined) {
    const valueStr = data.leaseBuyout ? "yes" : "no";
    const radio = document.getElementById(valueStr === "no" ? "lease-buyout-no" : "lease-buyout-yes");
    if (radio) radio.checked = true;
  }

  // Set inputs
  for (const [key, value] of Object.entries(data)) {
    if (key === "condition" || key === "leaseBuyout") continue;
    
    const id = INPUT_IDS[key];
    if (!id) continue;

    const el = document.getElementById(id);
    if (!el) continue;

    // Convert decimal parameters back to percentages if they represent rate inputs
    const rateKeys = ["taxRate", "opportunityRate", "apr", "residual", "hybridDeprAdj", "hybridInsurancePremium"];
    if (rateKeys.includes(key) && value !== undefined) {
      el.value = (value * 100).toFixed(1);
    } else {
      el.value = value;
    }
  }

  // Trigger DOM updates
  document.getElementById("input-period-years").dispatchEvent(new Event("input"));
  updateHybridPricePremium();
  updateFuelCostPreviews();
  validateInputs();
}

/**
 * Sets specific preset configuration.
 * @param {string} type - Preset key name.
 */
function loadPreset(type) {
  const data = PRESETS[type];
  if (!data) return;

  // Toggle active styling on buttons
  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.classList.remove("is-active");
  });
  const activeBtn = document.getElementById(`preset-${type}`);
  if (activeBtn) activeBtn.classList.add("is-active");

  setInputs(data);
  changeCallback();
}
