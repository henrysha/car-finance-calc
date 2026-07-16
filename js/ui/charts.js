/**
 * Chart rendering module.
 * Initializes and updates all Chart.js visualizations: Total Cost, Equity, Cash Flow, Breakeven, Sensitivity, and breakdowns.
 * @module ui/charts
 */

const chartInstances = {};

// Custom color palette matching design tokens
const COLORS = {
  cashGas: "rgba(16, 185, 129, 0.7)",      // Solid emerald
  cashHybrid: "rgba(16, 185, 129, 1)",    // High-visibility emerald
  financeGas: "rgba(59, 130, 246, 0.7)",   // Solid blue
  financeHybrid: "rgba(59, 130, 246, 1)",  // High-visibility blue
  leaseGas: "rgba(245, 158, 11, 0.7)",     // Solid amber
  leaseHybrid: "rgba(245, 158, 11, 1)",    // High-visibility amber
  gasLine: "#ef4444",                      // Red/warm line
  hybridLine: "#22c55e",                   // Eco green line
  accent: "#8b5cf6",                       // Purple accent
};

/**
 * Configure Chart.js defaults based on active theme.
 */
function getThemeDefaults() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  
  return {
    textColor: isLight ? "#44445a" : "#b0b0c8",
    gridColor: isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)",
    tooltipBg: isLight ? "#ffffff" : "#1e1e2e",
    tooltipBorder: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)",
    tooltipText: isLight ? "#1a1a2e" : "#e8e8f0",
  };
}

/**
 * Update or initialize all charts.
 */
export function updateCharts(data) {
  const theme = getThemeDefaults();

  // Set global Chart.js defaults
  Chart.defaults.color = theme.textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.tooltip.backgroundColor = theme.tooltipBg;
  Chart.defaults.plugins.tooltip.titleColor = theme.tooltipText;
  Chart.defaults.plugins.tooltip.bodyColor = theme.tooltipText;
  Chart.defaults.plugins.tooltip.borderColor = theme.tooltipBorder;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;

  renderTotalCostChart(data, theme);
  renderEquityChart(data, theme);
  renderCashFlowChart(data, theme);
  renderFuelBreakevenChart(data, theme);
  renderMileageSensitivityChart(data, theme);
  renderBreakdownChart("chart-breakdown-gas", data.gasWinnerData || data.financeGas, "Gasoline Option Cost Breakdown", theme);
  renderBreakdownChart("chart-breakdown-hybrid", data.hybridWinnerData || data.financeHybrid, "Hybrid Option Cost Breakdown", theme);
}

/**
 * Chart 1: Total Cost Bar Chart
 */
function renderTotalCostChart(data, theme) {
  const ctx = document.getElementById("chart-total-cost").getContext("2d");
  
  if (chartInstances["total-cost"]) {
    chartInstances["total-cost"].destroy();
  }

  const { cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid } = data;

  const datasetData = [
    cashGas, cashHybrid,
    financeGas, financeHybrid,
    leaseGas, leaseHybrid
  ];

  // Stacked segments: Purchase/Payments, Interest, Depreciation, Fuel, Opportunity Cost, Fees/Maint/Ins
  const datasets = [
    {
      label: "Depreciation / Resale Loss",
      data: datasetData.map(col => {
        // Lease has no depreciation (you don't own it)
        if (col.method === "lease") return 0;
        return col.vehiclePrice - col.vehicleValueAtEnd;
      }),
      backgroundColor: "rgba(239, 68, 68, 0.45)",
    },
    {
      label: "Lease Payments / Depreciation equivalent",
      data: datasetData.map(col => {
        if (col.method !== "lease") return 0;
        return col.totalPayments;
      }),
      backgroundColor: "rgba(245, 158, 11, 0.45)",
    },
    {
      label: "Interest Paid",
      data: datasetData.map(col => col.totalInterest || 0),
      backgroundColor: "rgba(59, 130, 246, 0.45)",
    },
    {
      label: "Fuel Cost",
      data: datasetData.map(col => col.totalFuelCost),
      backgroundColor: "rgba(34, 197, 94, 0.45)",
    },
    {
      label: "Opportunity Cost (ROI Foregone)",
      data: datasetData.map(col => col.opportunityCost),
      backgroundColor: "rgba(139, 92, 246, 0.45)",
    },
    {
      label: "Insurance, Maintenance & Fees",
      data: datasetData.map(col => {
        return col.totalInsurance + col.totalMaintenance + col.totalFees;
      }),
      backgroundColor: "rgba(107, 114, 128, 0.45)",
    }
  ];

  chartInstances["total-cost"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Cash (Gas)", "Cash (Hybrid)",
        "Finance (Gas)", "Finance (Hybrid)",
        "Lease (Gas)", "Lease (Hybrid)"
      ],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: theme.gridColor }
        },
        y: {
          stacked: true,
          grid: { color: theme.gridColor },
          ticks: {
            callback: (val) => "$" + val.toLocaleString()
          }
        }
      }
    }
  });
}

/**
 * Chart 2: Equity Over Time Line Chart
 */
function renderEquityChart(data, theme) {
  const ctx = document.getElementById("chart-equity").getContext("2d");

  if (chartInstances["equity"]) {
    chartInstances["equity"].destroy();
  }

  const { cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid } = data;
  
  // X axis is months
  const maxMonths = cashGas.comparisonMonths;
  const labels = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  const getEquityArray = (methodResult) => {
    return methodResult.monthlyData.map(m => m.equity);
  };

  chartInstances["equity"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Cash (Gas)",
          data: getEquityArray(cashGas),
          borderColor: COLORS.cashGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Cash (Hybrid)",
          data: getEquityArray(cashHybrid),
          borderColor: COLORS.cashHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Finance (Gas)",
          data: getEquityArray(financeGas),
          borderColor: COLORS.financeGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Finance (Hybrid)",
          data: getEquityArray(financeHybrid),
          borderColor: COLORS.financeHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Lease (Gas)",
          data: getEquityArray(leaseGas),
          borderColor: COLORS.leaseGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Lease (Hybrid)",
          data: getEquityArray(leaseHybrid),
          borderColor: COLORS.leaseHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        x: {
          title: { display: true, text: "Month" },
          grid: { color: theme.gridColor }
        },
        y: {
          title: { display: true, text: "Vehicle Equity ($)" },
          grid: { color: theme.gridColor },
          ticks: {
            callback: (val) => "$" + val.toLocaleString()
          }
        }
      }
    }
  });
}

/**
 * Chart 3: Monthly Cash Outflow Timeline
 */
function renderCashFlowChart(data, theme) {
  const ctx = document.getElementById("chart-cashflow").getContext("2d");

  if (chartInstances["cashflow"]) {
    chartInstances["cashflow"].destroy();
  }

  const { cashGas, cashHybrid, financeGas, financeHybrid, leaseGas, leaseHybrid } = data;
  const maxMonths = cashGas.comparisonMonths;
  const labels = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  const getCumulativeCostArray = (methodResult) => {
    return methodResult.monthlyData.map(m => m.cumulativeCost);
  };

  chartInstances["cashflow"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Cash (Gas)",
          data: getCumulativeCostArray(cashGas),
          borderColor: COLORS.cashGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Cash (Hybrid)",
          data: getCumulativeCostArray(cashHybrid),
          borderColor: COLORS.cashHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Finance (Gas)",
          data: getCumulativeCostArray(financeGas),
          borderColor: COLORS.financeGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Finance (Hybrid)",
          data: getCumulativeCostArray(financeHybrid),
          borderColor: COLORS.financeHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Lease (Gas)",
          data: getCumulativeCostArray(leaseGas),
          borderColor: COLORS.leaseGas,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Lease (Hybrid)",
          data: getCumulativeCostArray(leaseHybrid),
          borderColor: COLORS.leaseHybrid,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        x: {
          title: { display: true, text: "Month" },
          grid: { color: theme.gridColor }
        },
        y: {
          title: { display: true, text: "Cumulative Cash Outflow ($)" },
          grid: { color: theme.gridColor },
          ticks: {
            callback: (val) => "$" + val.toLocaleString()
          }
        }
      }
    }
  });
}

/**
 * Chart 4: Fuel Savings Breakeven Chart
 */
function renderFuelBreakevenChart(data, theme) {
  const ctx = document.getElementById("chart-fuel-breakeven").getContext("2d");

  if (chartInstances["fuel-breakeven"]) {
    chartInstances["fuel-breakeven"].destroy();
  }

  const { fuelAnalysis, cashGas } = data;
  const maxMonths = cashGas.comparisonMonths;

  // Monthly values
  const labels = Array.from({ length: maxMonths + 1 }, (_, i) => i);
  const premium = fuelAnalysis.hybridPremium;
  const premiumLine = Array(maxMonths + 1).fill(premium);
  
  const savingsData = [0];
  const monthlySavings = fuelAnalysis.annualSavings / 12;
  for (let m = 1; m <= maxMonths; m++) {
    savingsData.push(Math.round(monthlySavings * m * 100) / 100);
  }

  chartInstances["fuel-breakeven"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Cumulative Fuel Savings ($)",
          data: savingsData,
          borderColor: COLORS.hybridLine,
          backgroundColor: "rgba(34, 197, 94, 0.05)",
          borderWidth: 3,
          fill: true,
          pointRadius: 0
        },
        {
          label: "Hybrid Price Premium ($)",
          data: premiumLine,
          borderColor: COLORS.gasLine,
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        x: {
          title: { display: true, text: "Month" },
          grid: { color: theme.gridColor }
        },
        y: {
          title: { display: true, text: "Savings / Cost ($)" },
          grid: { color: theme.gridColor },
          ticks: {
            callback: (val) => "$" + val.toLocaleString()
          }
        }
      }
    }
  });
}

/**
 * Chart 5: Mileage Sensitivity vs Payback
 */
function renderMileageSensitivityChart(data, theme) {
  const ctx = document.getElementById("chart-mileage-sensitivity").getContext("2d");

  if (chartInstances["mileage-sensitivity"]) {
    chartInstances["mileage-sensitivity"].destroy();
  }

  const { fuelAnalysis } = data;
  const mileagePoints = fuelAnalysis.mileageSensitivity;

  chartInstances["mileage-sensitivity"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: mileagePoints.map(item => item.miles.toLocaleString() + " mi"),
      datasets: [
        {
          label: "Breakeven Timeline (Months)",
          data: mileagePoints.map(item => {
            // Cap visual bar if payback is Infinity
            return !Number.isFinite(item.breakevenMonths) ? 120 : item.breakevenMonths;
          }),
          backgroundColor: COLORS.accent,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const monthsVal = context.raw;
              if (monthsVal >= 120) return "Payback: Never (Infinity)";
              return `Payback: ${monthsVal} months`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Annual Driving Mileage" },
          grid: { color: theme.gridColor }
        },
        y: {
          title: { display: true, text: "Months to Payback" },
          grid: { color: theme.gridColor },
          ticks: {
            callback: (val) => val >= 120 ? "Never" : val + " mo"
          }
        }
      }
    }
  });
}

/**
 * Charts 6 & 7: Cost Breakdown Donut/Pie Charts
 */
function renderBreakdownChart(canvasId, result, titleText, theme) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  // Cost items: Depreciation, Fuel, Interest, Maintenance, Insurance, Fees
  const labels = ["Depreciation", "Fuel Cost", "Interest Paid", "Maintenance", "Insurance", "Fees"];
  const values = [
    result.method === "lease" ? result.totalPayments : (result.vehiclePrice - result.vehicleValueAtEnd),
    result.totalFuelCost,
    result.totalInterest || 0,
    result.totalMaintenance,
    result.totalInsurance,
    result.totalFees || 0
  ];

  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "rgba(239, 68, 68, 0.6)",   // Depreciation
          "rgba(34, 197, 94, 0.6)",   // Fuel
          "rgba(59, 130, 246, 0.6)",  // Interest
          "rgba(245, 158, 11, 0.6)",  // Maintenance
          "rgba(139, 92, 246, 0.6)",  // Insurance
          "rgba(107, 114, 128, 0.6)", // Fees
        ],
        borderColor: theme.tooltipBg,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
      }
    }
  });
}
