/**
 * Results UI rendering module.
 * Updates summary cards, comparison table, recommendation section, and fuel spotlight.
 * Handles display toggling between fuel types.
 * @module ui/results
 */

import { formatCurrency, formatMonths, formatNumber } from "../utils/format.js";

let displayGas = true;
let displayHybrid = true;
let singleFuelViewMode = false; // toggled by "Show Selected Fuel Only" button

/**
 * Initialize results panel toggles and actions.
 */
export function initResults() {
  const btnGas = document.getElementById("btn-toggle-view-gas");
  const btnHybrid = document.getElementById("btn-toggle-view-hybrid");
  const btnTableColToggle = document.getElementById("btn-toggle-table-columns");

  btnGas.addEventListener("click", () => {
    displayGas = !displayGas;
    if (!displayGas && !displayHybrid) displayHybrid = true; // force one active
    updateViewToggles();
    applyVisibilityFilters();
  });

  btnHybrid.addEventListener("click", () => {
    displayHybrid = !displayHybrid;
    if (!displayGas && !displayHybrid) displayGas = true; // force one active
    updateViewToggles();
    applyVisibilityFilters();
  });

  btnTableColToggle.addEventListener("click", () => {
    singleFuelViewMode = !singleFuelViewMode;
    btnTableColToggle.textContent = singleFuelViewMode 
      ? "Show All Fuel Types" 
      : "Show Selected Fuel Only";
    applyVisibilityFilters();
  });
}

function updateViewToggles() {
  const btnGas = document.getElementById("btn-toggle-view-gas");
  const btnHybrid = document.getElementById("btn-toggle-view-hybrid");

  if (displayGas) btnGas.classList.add("is-active");
  else btnGas.classList.remove("is-active");

  if (displayHybrid) btnHybrid.classList.add("is-active");
  else btnHybrid.classList.remove("is-active");
}

/**
 * Applies CSS display visibility rules to summary cards and comparison table columns.
 */
function applyVisibilityFilters() {
  const cardCashGas = document.getElementById("card-cash-gas");
  const cardFinanceGas = document.getElementById("card-finance-gas");
  const cardLeaseGas = document.getElementById("card-lease-gas");
  const cardCashHybrid = document.getElementById("card-cash-hybrid");
  const cardFinanceHybrid = document.getElementById("card-finance-hybrid");
  const cardLeaseHybrid = document.getElementById("card-lease-hybrid");

  // Show/Hide summary cards
  cardCashGas.style.display = displayGas ? "flex" : "none";
  cardFinanceGas.style.display = displayGas ? "flex" : "none";
  cardLeaseGas.style.display = displayGas ? "flex" : "none";
  
  cardCashHybrid.style.display = displayHybrid ? "flex" : "none";
  cardFinanceHybrid.style.display = displayHybrid ? "flex" : "none";
  cardLeaseHybrid.style.display = displayHybrid ? "flex" : "none";

  // Table columns show/hide
  const table = document.getElementById("comparison-table");
  if (!table) return;

  const showGasCols = displayGas && (!singleFuelViewMode || (displayGas && !displayHybrid));
  const showHybridCols = displayHybrid && (!singleFuelViewMode || (displayHybrid && !displayGas) || (displayHybrid && singleFuelViewMode));

  // Determine indices
  // Column mapping: 0=Category, 1=CashGas, 2=CashHybrid, 3=FinanceGas, 4=FinanceHybrid, 5=LeaseGas, 6=LeaseHybrid
  const colIndices = {
    gas: [1, 3, 5],
    hybrid: [2, 4, 6]
  };

  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.cells;
    if (cells.length < 7) return;

    // Toggle Gas columns
    colIndices.gas.forEach(idx => {
      cells[idx].style.display = showGasCols ? "" : "none";
    });

    // Toggle Hybrid columns
    colIndices.hybrid.forEach(idx => {
      cells[idx].style.display = showHybridCols ? "" : "none";
    });
  });
}

/**
 * Update the Results display with the computed outputs.
 */
export function updateResults(data) {
  const { cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid, comparison, fuelAnalysis } = data;

  // 1. Render Summary Cards
  renderSummaryCard("cash-gas", cashGas, comparison);
  renderSummaryCard("finance-gas", financeGas, comparison);
  renderSummaryCard("lease-gas", leaseGas, comparison);
  renderSummaryCard("cash-hybrid", cashHybrid, comparison);
  renderSummaryCard("finance-hybrid", financeHybrid, comparison);
  renderSummaryCard("lease-hybrid", leaseHybrid, comparison);

  // 2. Fuel Payback Spotlight
  updateFuelSpotlight(fuelAnalysis, comparison);

  // 3. Recommendation Section
  updateRecommendationCard(comparison);

  // 4. Comparison Table
  renderComparisonTable(data);

  // Reapply filters in case inputs reset or changed columns
  applyVisibilityFilters();
}

function renderSummaryCard(idPrefix, methodData, comparison) {
  const costEl = document.getElementById(`cost-${idPrefix}`);
  const upfrontEl = document.getElementById(`upfront-${idPrefix}`);
  const equityEl = document.getElementById(`equity-${idPrefix}`);
  const fuelEl = document.getElementById(`fuel-${idPrefix}`);
  const card = document.getElementById(`card-${idPrefix}`);
  const badgeContainer = document.getElementById(`badge-${idPrefix}`);

  // Set values
  costEl.textContent = formatCurrency(methodData.totalCost);
  upfrontEl.textContent = formatCurrency(methodData.upfrontCost);
  fuelEl.textContent = formatCurrency(methodData.totalFuelCost);

  // Opportunity cost, interest, or lease payments
  if (idPrefix.startsWith("cash")) {
    const oppEl = document.getElementById(`opp-${idPrefix}`);
    if (oppEl) oppEl.textContent = formatCurrency(methodData.opportunityCost);
  } else if (idPrefix.startsWith("finance")) {
    const interestEl = document.getElementById(`interest-${idPrefix}`);
    if (interestEl) interestEl.textContent = formatCurrency(methodData.totalInterest);
    const monthlyEl = document.getElementById(`monthly-${idPrefix}`);
    if (monthlyEl) monthlyEl.textContent = `${formatCurrency(methodData.monthlyPayment)}/mo`;
  } else {
    const totalPmtsEl = document.getElementById(`total-pmts-${idPrefix}`);
    if (totalPmtsEl) totalPmtsEl.textContent = formatCurrency(methodData.totalPayments);
    const monthlyEl = document.getElementById(`monthly-${idPrefix}`);
    if (monthlyEl) monthlyEl.textContent = `${formatCurrency(methodData.monthlyPayment)}/mo`;
  }

  // End Value Equity
  equityEl.textContent = formatCurrency(methodData.equityAtEnd);

  // Winner highlight checks
  card.classList.remove("is-winner", "is-winner--cash", "is-winner--finance", "is-winner--lease");
  badgeContainer.innerHTML = "";

  const isWinner = comparison.winner.method === methodData.method && comparison.winner.fuelType === methodData.fuelType;
  
  if (isWinner) {
    card.classList.add("is-winner", `is-winner--${methodData.method}`);
    
    const badge = document.createElement("span");
    badge.className = "badge badge--winner";
    badge.textContent = "🏆 Winner";
    badgeContainer.appendChild(badge);
  }
}

function updateFuelSpotlight(fuel, comparison) {
  const savingsEl = document.getElementById("spotlight-fuel-savings");
  const paybackEl = document.getElementById("spotlight-payback-months");
  const headlineEl = document.getElementById("spotlight-headline");
  const descEl = document.getElementById("spotlight-desc");

  if (fuel.annualSavings > 0) {
    savingsEl.textContent = `${formatCurrency(fuel.annualSavings)}/yr`;
    
    if (Number.isFinite(fuel.breakevenMonths)) {
      paybackEl.textContent = `${Math.round(fuel.breakevenMonths)} mo`;
      headlineEl.textContent = `Breaks even in ${formatMonths(fuel.breakevenMonths)}`;
      descEl.textContent = `At an annual mileage of ${formatNumber(fuel.miles)} miles and gas at ${formatCurrency(fuel.gasPrice)}/gal, the hybrid fuel savings will fully recoup the upfront premium of ${formatCurrency(fuel.hybridPremium)} in about ${Math.round(fuel.breakevenMonths)} months.`;
    } else {
      paybackEl.textContent = "Never";
      headlineEl.textContent = "Never breaks even";
      descEl.textContent = "The hybrid fuel efficiency savings are not sufficient to recoup the purchase price premium within any reasonable driving timeline.";
    }
  } else {
    savingsEl.textContent = "$0/yr";
    paybackEl.textContent = "N/A";
    headlineEl.textContent = "No hybrid savings";
    descEl.textContent = "The hybrid model MPG is less than or equal to the gasoline model. No fuel savings are realized.";
  }
}

function updateRecommendationCard(comparison) {
  document.getElementById("rec-acquisition-text").textContent = comparison.methodRecommendation.reason;
  document.getElementById("rec-fuel-text").textContent = comparison.fuelRecommendation.reason;
  document.getElementById("rec-combined-text").textContent = comparison.combinedRecommendation;

  const notesList = document.getElementById("rec-sensitivity-notes");
  notesList.innerHTML = "";

  comparison.sensitivityNotes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    notesList.appendChild(li);
  });
}

function renderComparisonTable(data) {
  const tbody = document.querySelector("#comparison-table tbody");
  tbody.innerHTML = "";

  const { cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid } = data;
  const cols = [cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid];

  const tableRows = [
    // SECTION: INITIAL PURCHASE
    { section: "Upfront Cost Details" },
    { label: "Purchase Price / MSRP", key: "price", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Down Payment & Trade-In Credit", key: "upfrontDown", format: formatCurrency, isCost: false, bestRule: "max" },
    { label: "Tax & Registration Fees", key: "upfrontTaxAndFees", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Net Upfront Cash Outlay", key: "upfrontCost", format: formatCurrency, isCost: true, bestRule: "min" },

    // SECTION: MONTHLY / ONGOING COSTS
    { section: "Ongoing Cash Outlays" },
    { label: "Contract Monthly Payment", key: "monthlyPayment", format: (v) => v > 0 ? `${formatCurrency(v)}/mo` : "—", isCost: true, bestRule: "min" },
    { label: "Average Monthly Fuel Outflow", key: "monthlyFuelCost", format: (v) => `${formatCurrency(v)}/mo`, isCost: true, bestRule: "min" },
    { label: "Average Monthly Insurance", key: "monthlyInsurance", format: (v) => `${formatCurrency(v)}/mo`, isCost: true, bestRule: "min" },
    { label: "Average Monthly Maintenance", key: "monthlyMaintenance", format: (v) => `${formatCurrency(v)}/mo`, isCost: true, bestRule: "min" },

    // SECTION: PERIOD TOTALS
    { section: "Cumulative Term Totals" },
    { label: "Total Lease/Finance Payments", key: "totalPayments", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Total Interest Paid", key: "totalInterest", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Total Fuel Spend", key: "totalFuelCost", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Total Maintenance & Repair Cost", key: "totalMaintenance", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Opportunity Cost (ROI Foregone)", key: "opportunityCost", format: formatCurrency, isCost: true, bestRule: "min" },

    // SECTION: END OF PERIOD BALANCE
    { section: "End of Term Asset Valuation" },
    { label: "Estimated Resale Value", key: "vehicleValueAtEnd", format: formatCurrency, isCost: false, bestRule: "max" },
    { label: "Outstanding Loan Principal", key: "loanBalanceAtEnd", format: formatCurrency, isCost: true, bestRule: "min" },
    { label: "Net Asset Equity", key: "equityAtEnd", format: formatCurrency, isCost: false, bestRule: "max" },

    // SECTION: GRAND TOTALS
    { section: "True Ownership Totals" },
    { label: "True Net Ownership Cost", key: "totalCost", format: formatCurrency, isCost: true, bestRule: "min", highlightRow: true },
    { label: "Effective Monthly Cost", key: "effectiveMonthlyCost", format: (v) => `${formatCurrency(v)}/mo`, isCost: true, bestRule: "min", highlightRow: true },
  ];

  // Map dataset values for formatting
  const getVal = (col, key) => {
    switch (key) {
      case "price": return col.vehiclePrice;
      case "upfrontDown": return col.downPayment + (col.tradeIn || 0);
      case "upfrontTaxAndFees": return (col.totalTax || 0) + (col.totalFees || 0);
      case "upfrontCost": return col.upfrontCost;
      case "monthlyPayment": return col.monthlyPayment || 0;
      case "monthlyFuelCost": return col.totalFuelCost / (col.comparisonMonths || 60);
      case "monthlyInsurance": return col.totalInsurance / (col.comparisonMonths || 60);
      case "monthlyMaintenance": return col.totalMaintenance / (col.comparisonMonths || 60);
      case "totalPayments": return col.totalPayments || 0;
      case "totalInterest": return col.totalInterest || 0;
      case "totalFuelCost": return col.totalFuelCost;
      case "totalMaintenance": return col.totalMaintenance;
      case "opportunityCost": return col.opportunityCost;
      case "vehicleValueAtEnd": return col.vehicleValueAtEnd || 0;
      case "loanBalanceAtEnd": return col.loanBalance || 0;
      case "equityAtEnd": return col.equityAtEnd;
      case "totalCost": return col.totalCost;
      case "effectiveMonthlyCost": return col.effectiveMonthlyCost;
      default: return 0;
    }
  };

  tableRows.forEach((rowData) => {
    const tr = document.createElement("tr");

    if (rowData.section) {
      tr.className = "table-section-row";
      const td = document.createElement("td");
      td.setAttribute("colspan", "7");
      td.textContent = rowData.section;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    // Label column
    const tdLabel = document.createElement("td");
    tdLabel.textContent = rowData.label;
    if (rowData.highlightRow) {
      tdLabel.style.fontWeight = "bold";
      tdLabel.style.fontSize = "var(--fs-base)";
    }
    tr.appendChild(tdLabel);

    // Compute cell values
    const cellVals = cols.map((col) => getVal(col, rowData.key));

    // Determine the "best" column index in the row
    let bestIdx = -1;
    if (rowData.bestRule) {
      let targetVal = rowData.bestRule === "min" ? Infinity : -Infinity;
      
      cellVals.forEach((val, idx) => {
        // Skip N/A or logical zeros for values that are not applicable (like outstanding loan balance on cash)
        if (rowData.key === "loanBalanceAtEnd" && cols[idx].method !== "finance") return;
        if (rowData.key === "totalInterest" && cols[idx].method !== "finance") return;

        if (rowData.bestRule === "min") {
          if (val < targetVal) {
            targetVal = val;
            bestIdx = idx;
          }
        } else {
          if (val > targetVal) {
            targetVal = val;
            bestIdx = idx;
          }
        }
      });
    }

    // Append cells
    cols.forEach((col, idx) => {
      const td = document.createElement("td");
      const rawVal = cellVals[idx];
      td.textContent = rowData.format(rawVal);
      td.className = "number-display";

      // Highlight best cell
      if (idx === bestIdx) {
        td.classList.add("is-best");
      }

      if (rowData.highlightRow) {
        td.style.fontWeight = "bold";
        td.style.fontSize = "var(--fs-base)";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}
