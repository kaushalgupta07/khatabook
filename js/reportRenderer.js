// Report renderer - UI rendering for each report type

let monthlyTrendChartInstance = null;
let categoryExpenseChartInstance = null;

/**
 * Get report title based on report type.
 */
function getReportTitle(reportType) {
  const titles = {
    "expense-summary": "Expense Summary Report",
    "income-summary": "Income Summary Report",
    "category-expense": "Category-wise Expenses",
    "account-summary": "Account-wise Report",
    "monthly-trend": "Monthly Trend",
    "detailed": "Detailed Transactions",
  };
  return titles[reportType] || "Report";
}

/**
 * Show loading state.
 */
function showReportLoading(show) {
  const loadingEl = document.getElementById("report-loading");
  if (loadingEl) {
    loadingEl.style.display = show ? "flex" : "none";
  }
}

/**
 * Show empty state.
 */
function showReportEmpty(show, message = "No data available for this report.") {
  const emptyEl = document.getElementById("report-empty");
  if (emptyEl) {
    emptyEl.textContent = message;
    emptyEl.style.display = show ? "block" : "none";
  }
}

/**
 * Render Expense Summary Report.
 */
function renderExpenseSummaryReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || data.totalExpense === 0 && (!data.categoryBreakdown || data.categoryBreakdown.length === 0)) {
    showReportEmpty(true, "No expense transactions found.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  let html = `
    <div class="kb-report-header-section">
      <h2>Expense Summary Report</h2>
    </div>
    
    <section class="kb-report-summary-cards">
      <div class="card">
        <h3>Total Expense</h3>
        <p class="kb-amount-large">₹${formatAmount(data.totalExpense)}</p>
      </div>
    </section>

    <section class="kb-report-table-section">
      <h3>Category-wise Expense Breakdown</h3>
      <table class="kb-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    data.categoryBreakdown
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .forEach((item) => {
        html += `
          <tr>
            <td><span class="kb-pill">${item.category}</span></td>
            <td class="kb-amount">₹${formatAmount(item.totalAmount)}</td>
          </tr>
        `;
      });
  } else {
    html += `<tr><td colspan="2" class="kb-empty">No category data available.</td></tr>`;
  }

  html += `
        </tbody>
      </table>
    </section>
  `;

  container.innerHTML = html;
}

/**
 * Render Income Summary Report.
 */
function renderIncomeSummaryReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || data.totalIncome === 0 && (!data.categoryBreakdown || data.categoryBreakdown.length === 0)) {
    showReportEmpty(true, "No income transactions found.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  let html = `
    <div class="kb-report-header-section">
      <h2>Income Summary Report</h2>
    </div>
    
    <section class="kb-report-summary-cards">
      <div class="card">
        <h3>Total Income</h3>
        <p class="kb-amount-large">₹${formatAmount(data.totalIncome)}</p>
      </div>
    </section>

    <section class="kb-report-table-section">
      <h3>Category-wise Income Summary</h3>
      <table class="kb-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    data.categoryBreakdown
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .forEach((item) => {
        html += `
          <tr>
            <td><span class="kb-pill">${item.category}</span></td>
            <td class="kb-amount">₹${formatAmount(item.totalAmount)}</td>
          </tr>
        `;
      });
  } else {
    html += `<tr><td colspan="2" class="kb-empty">No category data available.</td></tr>`;
  }

  html += `
        </tbody>
      </table>
    </section>
  `;

  container.innerHTML = html;
}

/**
 * Render Category-wise Expenses Report.
 */
function renderCategoryWiseExpensesReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || !data.categories || data.categories.length === 0) {
    showReportEmpty(true, "No expense transactions found.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  // Destroy existing chart
  if (categoryExpenseChartInstance) {
    categoryExpenseChartInstance.destroy();
    categoryExpenseChartInstance = null;
  }

  let html = `
    <div class="kb-report-header-section">
      <h2>Category-wise Expenses</h2>
    </div>

    <section class="kb-report-cards-grid">
  `;

  data.categories.forEach((item) => {
    html += `
      <div class="card kb-category-card" data-category="${item.category}">
        <h3>${item.category}</h3>
        <p class="kb-amount-large">₹${formatAmount(item.totalSpent)}</p>
      </div>
    `;
  });

  html += `
    </section>

    <section class="kb-report-chart-section">
      <h3>Expenses by Category</h3>
      <canvas id="category-expense-chart" width="400" height="250"></canvas>
    </section>
  `;

  container.innerHTML = html;

  // Render chart
  if (window.Chart) {
    const canvas = document.getElementById("category-expense-chart");
    if (canvas) {
      const labels = data.categories.map((c) => c.category);
      const values = data.categories.map((c) => c.totalSpent);

      categoryExpenseChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Expenses by Category",
              data: values,
              backgroundColor: [
                "#22c55e",
                "#38bdf8",
                "#f97316",
                "#eab308",
                "#a855f7",
                "#f43f5e",
                "#0ea5e9",
                "#4ade80",
              ],
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55, 65, 81, 0.4)" },
            },
            y: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55, 65, 81, 0.4)" },
            },
          },
        },
      });
    }
  }
}

/**
 * Render Account-wise Report.
 */
function renderAccountWiseReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || !data.accounts || data.accounts.length === 0) {
    showReportEmpty(true, "No account data available.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  let html = `
    <div class="kb-report-header-section">
      <h2>Account-wise Report</h2>
    </div>

    <section class="kb-report-table-section">
      <table class="kb-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Inflow (₹)</th>
            <th>Outflow (₹)</th>
            <th>Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.accounts.forEach((account) => {
    const balanceClass = account.currentBalance < 0 ? "negative" : "";
    html += `
      <tr>
        <td>${account.accountIcon || ""} ${account.accountName}</td>
        <td class="kb-amount">₹${formatAmount(account.inflow)}</td>
        <td class="kb-amount">₹${formatAmount(account.outflow)}</td>
        <td class="kb-amount ${balanceClass}">₹${formatAmount(account.currentBalance)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </section>
  `;

  container.innerHTML = html;
}

/**
 * Render Monthly Trend Report.
 */
function renderMonthlyTrendReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || !data.months || data.months.length === 0) {
    showReportEmpty(true, "No transaction data available for monthly trend.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  // Destroy existing chart
  if (monthlyTrendChartInstance) {
    monthlyTrendChartInstance.destroy();
    monthlyTrendChartInstance = null;
  }

  let html = `
    <div class="kb-report-header-section">
      <h2>Monthly Trend</h2>
    </div>

    <section class="kb-report-chart-section">
      <h3>Expense vs Income by Month</h3>
      <canvas id="monthly-trend-chart" width="400" height="240"></canvas>
    </section>

    <section class="kb-report-table-section">
      <h3>Monthly Summary</h3>
      <table class="kb-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Total Expense (₹)</th>
            <th>Total Income (₹)</th>
            <th>Net (₹)</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.months.forEach((month) => {
    const netClass = month.net < 0 ? "negative" : "";
    html += `
      <tr>
        <td>${month.month}</td>
        <td class="kb-amount">₹${formatAmount(month.totalExpense)}</td>
        <td class="kb-amount">₹${formatAmount(month.totalIncome)}</td>
        <td class="kb-amount ${netClass}">₹${formatAmount(month.net)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </section>
  `;

  container.innerHTML = html;

  // Render chart
  if (window.Chart) {
    const canvas = document.getElementById("monthly-trend-chart");
    if (canvas) {
      const labels = data.months.map((m) => m.month);
      const expenseData = data.months.map((m) => m.totalExpense);
      const incomeData = data.months.map((m) => m.totalIncome);

      monthlyTrendChartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Expense",
              data: expenseData,
              borderColor: "rgba(248, 113, 113, 1)",
              backgroundColor: "rgba(248, 113, 113, 0.2)",
              tension: 0.4,
            },
            {
              label: "Income",
              data: incomeData,
              borderColor: "rgba(34, 197, 94, 1)",
              backgroundColor: "rgba(34, 197, 94, 0.2)",
              tension: 0.4,
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              labels: {
                color: "#e5e7eb",
                font: { size: 11 },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55, 65, 81, 0.4)" },
            },
            y: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55, 65, 81, 0.4)" },
            },
          },
        },
      });
    }
  }
}

/**
 * Render Detailed Transactions Report.
 */
function renderDetailedTransactionsReport(data) {
  const container = document.getElementById("report-content");
  if (!container) return;

  if (!data || !data.transactions || data.transactions.length === 0) {
    showReportEmpty(true, "No transactions found.");
    container.innerHTML = "";
    return;
  }

  showReportEmpty(false);

  let html = `
    <div class="kb-report-header-section">
      <h2>Detailed Transactions</h2>
    </div>

    <section class="kb-report-table-section">
      <table class="kb-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>From → To</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.transactions.forEach((txn) => {
    const typeLabel = txn.type.charAt(0).toUpperCase() + txn.type.slice(1);
    html += `
      <tr>
        <td>${txn.date}</td>
        <td>${typeLabel}</td>
        <td><span class="kb-pill">${txn.category}</span></td>
        <td>${txn.fromAccount} → ${txn.toAccount}</td>
        <td class="kb-amount">₹${formatAmount(txn.amount)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </section>
  `;

  container.innerHTML = html;
}

/**
 * Main render function - switches based on report type.
 */
function renderReport(reportType, data) {
  showReportLoading(false);

  switch (reportType) {
    case "expense-summary":
      renderExpenseSummaryReport(data);
      break;
    case "income-summary":
      renderIncomeSummaryReport(data);
      break;
    case "category-expense":
      renderCategoryWiseExpensesReport(data);
      break;
    case "account-summary":
      renderAccountWiseReport(data);
      break;
    case "monthly-trend":
      renderMonthlyTrendReport(data);
      break;
    case "detailed":
      renderDetailedTransactionsReport(data);
      break;
    default:
      showReportEmpty(true, "Unknown report type.");
      const container = document.getElementById("report-content");
      if (container) container.innerHTML = "";
  }
}
