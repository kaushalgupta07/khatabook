// Advanced Reports & chart logic

document.addEventListener("DOMContentLoaded", () => {
  const detailBody = document.getElementById("report-table-body");
  const categoryBody = document.getElementById("report-category-body");
  const accountBody = document.getElementById("report-account-body");

  const totalExpenseEl = document.getElementById("report-total-expense");
  const totalIncomeEl = document.getElementById("report-total-income");
  const netBalanceEl = document.getElementById("report-net-balance");

  const trendCanvas = document.getElementById("trend-chart");
  const categoryCanvas = document.getElementById("category-chart");

  const summarySection = document.getElementById("report-summary-section");
  const trendSection = document.getElementById("report-trend-section");
  const categorySection = document.getElementById("report-category-section");
  const categoryTableSection = document.getElementById("report-category-table-section");
  const accountTableSection = document.getElementById("report-account-table-section");
  const detailSection = document.getElementById("report-detail-section");

  const loadingEl = document.getElementById("report-loading");
  const emptyEl = document.getElementById("report-empty");

  const dateRangeRadios = document.querySelectorAll('input[name="dateRange"]');
  const customDateRangeEl = document.getElementById("custom-date-range");
  const fromDateEl = document.getElementById("fromDate");
  const toDateEl = document.getElementById("toDate");

  const typeCheckboxes = document.querySelectorAll(".kb-report-filter-group:nth-of-type(2) input[type='checkbox']");
  const accountCheckboxes = document.querySelectorAll("#account-filter-options input[type='checkbox']");
  const categoryFilterEl = document.getElementById("categoryFilter");

  const viewSummaryEl = document.getElementById("view-summary");
  const viewCategoryTableEl = document.getElementById("view-category-table");
  const viewAccountTableEl = document.getElementById("view-account-table");
  const viewTrendChartEl = document.getElementById("view-trend-chart");
  const viewDetailTableEl = document.getElementById("view-detail-table");

  const generateBtn = document.getElementById("generateReportBtn");
  const resetBtn = document.getElementById("resetFiltersBtn");

  const savedSelect = document.getElementById("savedReports");
  const loadTemplateBtn = document.getElementById("loadTemplateBtn");
  const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  const deleteTemplateBtn = document.getElementById("deleteTemplateBtn");
  const templateNameInput = document.getElementById("templateName");

  const REPORT_TEMPLATES_KEY = "khatabook_report_templates";

  let trendChartInstance = null;
  let categoryChartInstance = null;

  // ---------- Helpers ----------

  function getTxnType(txn) {
    if (!txn) return "";
    const t = txn.type || txn.transactionType || "";
    return String(t).toLowerCase();
  }

  function isPay(txn) {
    return getTxnType(txn) === "pay";
  }

  function isReceive(txn) {
    return getTxnType(txn) === "receive";
  }

  function isTransfer(txn) {
    return getTxnType(txn) === "transfer";
  }

  function normalizeDateOnly(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getTodayRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { from: today, to: end };
  }

  function getThisMonthRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  function getLastMonthRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from, to };
  }

  function showLoading(show) {
    if (!loadingEl) return;
    loadingEl.style.display = show ? "flex" : "none";
  }

  function showEmpty(show) {
    if (!emptyEl) return;
    emptyEl.style.display = show ? "block" : "none";
  }

  function setSectionVisible(sectionEl, visible) {
    if (!sectionEl) return;
    sectionEl.style.display = visible ? "" : "none";
  }

  // Map group filters to actual account IDs
  function getAccountsByGroup() {
    const allAccounts = getAllAccounts();
    const groups = {
      cash: new Set(),
      banks: new Set(),
      investments: new Set(),
      liabilities: new Set(),
    };

    allAccounts.forEach((acc) => {
      const id = acc.id;
      const name = (acc.name || "").toLowerCase();

      if (id === "cash" || name.includes("cash")) {
        groups.cash.add(id);
      }
      if (id.startsWith("bank") || name.includes("bank")) {
        groups.banks.add(id);
      }
      if (name.includes("mutual") || name.includes("mf") || name.includes("stock") || name.includes("share") || name.includes("investment")) {
        groups.investments.add(id);
      }
      if (name.includes("loan") || name.includes("debt") || name.includes("liability") || id === "udhari") {
        groups.liabilities.add(id);
      }
    });

    return groups;
  }

  function getSelectedValues(nodeList) {
    return Array.from(nodeList)
      .filter((el) => el.checked)
      .map((el) => el.value);
  }

  function getSelectedCategories() {
    if (!categoryFilterEl) return [];
    return Array.from(categoryFilterEl.options)
      .filter((opt) => opt.selected)
      .map((opt) => opt.value);
  }

  // ---------- Core API ----------

  function applyFilters(allTransactions) {
    const typeValues = getSelectedValues(typeCheckboxes);
    const accountGroups = getSelectedValues(accountCheckboxes);
    const categoryValues = getSelectedCategories();

    // Date range
    let fromDate = null;
    let toDate = null;
    const selectedRange = Array.from(dateRangeRadios).find((r) => r.checked)?.value || "today";
    if (selectedRange === "today") {
      const { from, to } = getTodayRange();
      fromDate = from;
      toDate = to;
    } else if (selectedRange === "thisMonth") {
      const { from, to } = getThisMonthRange();
      fromDate = from;
      toDate = to;
    } else if (selectedRange === "lastMonth") {
      const { from, to } = getLastMonthRange();
      fromDate = from;
      toDate = to;
    } else if (selectedRange === "custom") {
      const fromVal = fromDateEl?.value;
      const toVal = toDateEl?.value;
      fromDate = fromVal ? normalizeDateOnly(fromVal) : null;
      toDate = toVal ? new Date(toVal + "T23:59:59.999") : null;
    }

    const groupMap = getAccountsByGroup();
    const selectedAccountIds = new Set();
    accountGroups.forEach((g) => {
      const set = groupMap[g];
      if (set) {
        set.forEach((id) => selectedAccountIds.add(id));
      }
    });

    const hasAccountFilter = selectedAccountIds.size > 0;
    const hasCategoryFilter = categoryValues.length > 0;
    const hasTypeFilter = typeValues.length > 0;

    return allTransactions.filter((txn) => {
      // Date filter
      if (fromDate || toDate) {
        const d = txn.date ? new Date(txn.date) : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
      }

      // Type filter
      const t = getTxnType(txn);
      if (hasTypeFilter && !typeValues.includes(t)) {
        return false;
      }

      // Account filter (either side)
      if (hasAccountFilter) {
        const debitId = getAccountIdFromTransactionField(txn.debitAccount);
        const creditId = getAccountIdFromTransactionField(txn.creditAccount);
        const match =
          (debitId && selectedAccountIds.has(debitId)) ||
          (creditId && selectedAccountIds.has(creditId));
        if (!match) return false;
      }

      // Category filter
      if (hasCategoryFilter) {
        const cat = txn.category || "Other";
        if (!categoryValues.includes(cat)) {
          return false;
        }
      }

      return true;
    });
  }

  function calculateSummary(transactions) {
    let expense = 0;
    let income = 0;

    transactions.forEach((txn) => {
      const amount = Number(txn.amount) || 0;
      if (isPay(txn)) {
        expense += amount;
      } else if (isReceive(txn)) {
        income += amount;
      }
      // Transfers do not affect totals
    });

    return {
      expense,
      income,
      net: income - expense,
    };
  }

  function groupByCategory(transactions) {
    const map = new Map();
    transactions.forEach((txn) => {
      const category = txn.category || "Other";
      const entry = map.get(category) || { expense: 0, income: 0 };
      const amount = Number(txn.amount) || 0;
      if (isPay(txn)) {
        entry.expense += amount;
      } else if (isReceive(txn)) {
        entry.income += amount;
      }
      map.set(category, entry);
    });
    return map;
  }

  function groupByAccount(transactions) {
    const map = new Map();
    transactions.forEach((txn) => {
      const amount = Number(txn.amount) || 0;

      const debitId = getAccountIdFromTransactionField(txn.debitAccount);
      const creditId = getAccountIdFromTransactionField(txn.creditAccount);

      if (isPay(txn)) {
        // Pay: from your account (debit) → external
        if (debitId) {
          const key = debitId;
          const entry = map.get(key) || { expense: 0, income: 0 };
          entry.expense += amount;
          map.set(key, entry);
        }
      } else if (isReceive(txn)) {
        // Receive: from external → your account (credit)
        if (creditId) {
          const key = creditId;
          const entry = map.get(key) || { expense: 0, income: 0 };
          entry.income += amount;
          map.set(key, entry);
        }
      }
      // Transfers are ignored for expense/income
    });
    return map;
  }

  function groupByMonth(transactions) {
    const map = new Map(); // key: "YYYY-MM", value: { expense, income }
    transactions.forEach((txn) => {
      if (!txn.date) return;
      const d = new Date(txn.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map.get(key) || { expense: 0, income: 0 };
      const amount = Number(txn.amount) || 0;
      if (isPay(txn)) {
        entry.expense += amount;
      } else if (isReceive(txn)) {
        entry.income += amount;
      }
      map.set(key, entry);
    });
    return map;
  }

  function buildTables(filtered) {
    // Detailed table
    if (detailBody) {
      if (!filtered.length) {
        detailBody.innerHTML = `<tr><td colspan="6" class="kb-empty">No transactions to display.</td></tr>`;
      } else {
        const rowsHtml = filtered
          .map((txn) => {
            const amount = Number(txn.amount) || 0;
            const dateStr = txn.date || "-";
            const category = txn.category || "Other";
            const desc = txn.description || "-";
            const type = getTxnType(txn) || "-";

            const debitId = getAccountIdFromTransactionField(txn.debitAccount);
            const creditId = getAccountIdFromTransactionField(txn.creditAccount);
            const debit = debitId ? getAccountDisplayNameWithIcon(debitId) : "-";
            const credit = creditId ? getAccountDisplayNameWithIcon(creditId) : "-";

            return `<tr>
              <td>${dateStr}</td>
              <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
              <td><span class="kb-pill">${category}</span></td>
              <td>${desc}</td>
              <td>${debit} → ${credit}</td>
              <td class="kb-amount">₹${formatAmount(amount)}</td>
            </tr>`;
          })
          .join("");
        detailBody.innerHTML = rowsHtml;
      }
    }

    // Category summary table
    if (categoryBody) {
      const categoryMap = groupByCategory(filtered);
      if (!categoryMap.size) {
        categoryBody.innerHTML = `<tr><td colspan="4" class="kb-empty">No category data.</td></tr>`;
      } else {
        const rows = [];
        Array.from(categoryMap.entries())
          .sort((a, b) => b[1].expense + b[1].income - (a[1].expense + a[1].income))
          .forEach(([category, { expense, income }]) => {
            const net = income - expense;
            rows.push(`<tr>
              <td>${category}</td>
              <td class="kb-amount">₹${formatAmount(expense)}</td>
              <td class="kb-amount">₹${formatAmount(income)}</td>
              <td class="kb-amount ${net < 0 ? "negative" : ""}">₹${formatAmount(net)}</td>
            </tr>`);
          });
        categoryBody.innerHTML = rows.join("");
      }
    }

    // Account summary table
    if (accountBody) {
      const accountMap = groupByAccount(filtered);
      if (!accountMap.size) {
        accountBody.innerHTML = `<tr><td colspan="4" class="kb-empty">No account data.</td></tr>`;
      } else {
        const rows = [];
        Array.from(accountMap.entries())
          .sort((a, b) => b[1].expense + b[1].income - (a[1].expense + a[1].income))
          .forEach(([accountId, { expense, income }]) => {
            const net = income - expense;
            const name = getAccountDisplayNameWithIcon(accountId);
            rows.push(`<tr>
              <td>${name}</td>
              <td class="kb-amount">₹${formatAmount(expense)}</td>
              <td class="kb-amount">₹${formatAmount(income)}</td>
              <td class="kb-amount ${net < 0 ? "negative" : ""}">₹${formatAmount(net)}</td>
            </tr>`);
          });
        accountBody.innerHTML = rows.join("");
      }
    }
  }

  function renderCharts(filtered) {
    const monthMap = groupByMonth(filtered);
    const monthKeys = Array.from(monthMap.keys()).sort();
    const expenseData = monthKeys.map((k) => monthMap.get(k).expense);
    const incomeData = monthKeys.map((k) => monthMap.get(k).income);

    // Destroy existing charts
    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    if (window.Chart && trendCanvas && monthKeys.length) {
      trendChartInstance = new Chart(trendCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: monthKeys,
          datasets: [
            {
              label: "Expense",
              data: expenseData,
              backgroundColor: "rgba(248, 113, 113, 0.8)",
            },
            {
              label: "Income",
              data: incomeData,
              backgroundColor: "rgba(34, 197, 94, 0.9)",
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

    // Category-wise expenses pie/bar (Pay only)
    const categoryMap = groupByCategory(filtered);
    const labels = [];
    const expenseValues = [];
    categoryMap.forEach((vals, cat) => {
      if (vals.expense > 0) {
        labels.push(cat);
        expenseValues.push(vals.expense);
      }
    });

    if (window.Chart && categoryCanvas && labels.length) {
      categoryChartInstance = new Chart(categoryCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              label: "Expenses by Category",
              data: expenseValues,
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
              borderWidth: 0,
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
        },
      });
    }
  }

  // ---------- Templates ----------

  function loadTemplatesFromStorage() {
    try {
      const raw = localStorage.getItem(REPORT_TEMPLATES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to read report templates", e);
      return [];
    }
  }

  function saveTemplatesToStorage(list) {
    try {
      localStorage.setItem(REPORT_TEMPLATES_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save report templates", e);
    }
  }

  function refreshTemplateDropdown() {
    if (!savedSelect) return;
    const templates = loadTemplatesFromStorage();
    savedSelect.innerHTML = `<option value="">Load saved report…</option>`;
    templates.forEach((tpl, index) => {
      const opt = document.createElement("option");
      opt.value = String(index);
      opt.textContent = tpl.name || `Template ${index + 1}`;
      savedSelect.appendChild(opt);
    });
  }

  function captureCurrentSettings() {
    return {
      dateRange: Array.from(dateRangeRadios).find((r) => r.checked)?.value || "today",
      fromDate: fromDateEl?.value || "",
      toDate: toDateEl?.value || "",
      types: getSelectedValues(typeCheckboxes),
      accounts: getSelectedValues(accountCheckboxes),
      categories: getSelectedCategories(),
      views: {
        summary: !!viewSummaryEl?.checked,
        categoryTable: !!viewCategoryTableEl?.checked,
        accountTable: !!viewAccountTableEl?.checked,
        trendChart: !!viewTrendChartEl?.checked,
        detailTable: !!viewDetailTableEl?.checked,
      },
    };
  }

  function applySettingsToUI(settings) {
    if (!settings) return;

    // Date range
    Array.from(dateRangeRadios).forEach((r) => {
      r.checked = r.value === settings.dateRange;
    });
    if (fromDateEl) fromDateEl.value = settings.fromDate || "";
    if (toDateEl) toDateEl.value = settings.toDate || "";
    customDateRangeEl.style.display = settings.dateRange === "custom" ? "grid" : "none";

    // Types
    Array.from(typeCheckboxes).forEach((cb) => {
      cb.checked = settings.types.includes(cb.value);
    });

    // Accounts
    Array.from(accountCheckboxes).forEach((cb) => {
      cb.checked = settings.accounts.includes(cb.value);
    });

    // Categories
    const categories = settings.categories || [];
    if (categoryFilterEl) {
      Array.from(categoryFilterEl.options).forEach((opt) => {
        opt.selected = categories.includes(opt.value);
      });
    }

    // Views
    if (viewSummaryEl) viewSummaryEl.checked = !!settings.views.summary;
    if (viewCategoryTableEl) viewCategoryTableEl.checked = !!settings.views.categoryTable;
    if (viewAccountTableEl) viewAccountTableEl.checked = !!settings.views.accountTable;
    if (viewTrendChartEl) viewTrendChartEl.checked = !!settings.views.trendChart;
    if (viewDetailTableEl) viewDetailTableEl.checked = !!settings.views.detailTable;
  }

  // ---------- Initialization ----------

  function initCategoryFilterOptions() {
    if (!categoryFilterEl) return;
    const config = typeof getCategoryConfig === "function" ? getCategoryConfig() : { pay: [], receive: [] };
    const set = new Set([...(config.pay || []), ...(config.receive || [])]);
    const values = Array.from(set.values()).sort();

    categoryFilterEl.innerHTML = "";
    values.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      categoryFilterEl.appendChild(opt);
    });
  }

  if (dateRangeRadios.length) {
    Array.from(dateRangeRadios).forEach((r) => {
      r.addEventListener("change", () => {
        customDateRangeEl.style.display = r.value === "custom" && r.checked ? "grid" : customDateRangeEl.style.display;
        if (r.value !== "custom" && r.checked) {
          customDateRangeEl.style.display = "none";
        }
      });
    });
  }

  initCategoryFilterOptions();
  refreshTemplateDropdown();

  // ---------- Report Generation ----------

  async function generateReport() {
    showLoading(true);
    showEmpty(false);

    let allTransactions = [];
    try {
      allTransactions = await getTransactions();
    } catch (e) {
      console.error("Error loading transactions:", e);
    }

    if (!allTransactions.length) {
      showLoading(false);
      showEmpty(true);
      setSectionVisible(summarySection, false);
      setSectionVisible(trendSection, false);
      setSectionVisible(categorySection, false);
      setSectionVisible(categoryTableSection, false);
      setSectionVisible(accountTableSection, false);
      setSectionVisible(detailSection, false);
      if (detailBody) {
        detailBody.innerHTML = `<tr><td colspan="6" class="kb-empty">No data available yet.</td></tr>`;
      }
      showLoading(false);
      return;
    }

    const filtered = applyFilters(allTransactions);

    if (!filtered.length) {
      showEmpty(true);
      setSectionVisible(summarySection, false);
      setSectionVisible(trendSection, false);
      setSectionVisible(categorySection, false);
      setSectionVisible(categoryTableSection, false);
      setSectionVisible(accountTableSection, false);
      setSectionVisible(detailSection, false);
      showLoading(false);
      return;
    }

    showEmpty(false);

    const summary = calculateSummary(filtered);
    if (totalExpenseEl) totalExpenseEl.textContent = `₹${formatAmount(summary.expense)}`;
    if (totalIncomeEl) totalIncomeEl.textContent = `₹${formatAmount(summary.income)}`;
    if (netBalanceEl) {
      netBalanceEl.textContent = `₹${formatAmount(summary.net)}`;
      netBalanceEl.className = summary.net < 0 ? "negative" : "";
    }

    // Build tables and charts
    buildTables(filtered);
    renderCharts(filtered);

    // Apply view toggles
    setSectionVisible(summarySection, !!viewSummaryEl?.checked);
    setSectionVisible(categoryTableSection, !!viewCategoryTableEl?.checked);
    setSectionVisible(accountTableSection, !!viewAccountTableEl?.checked);
    setSectionVisible(trendSection, !!viewTrendChartEl?.checked);
    setSectionVisible(categorySection, !!viewCategoryTableEl?.checked); // always show category chart with category table
    setSectionVisible(detailSection, !!viewDetailTableEl?.checked);
    showLoading(false);
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      generateReport();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // Reset date range
      Array.from(dateRangeRadios).forEach((r) => {
        r.checked = r.value === "today";
      });
      if (fromDateEl) fromDateEl.value = "";
      if (toDateEl) toDateEl.value = "";
      customDateRangeEl.style.display = "none";

      // Reset types
      Array.from(typeCheckboxes).forEach((cb) => {
        cb.checked = cb.value === "pay" || cb.value === "receive";
      });

      // Reset accounts (cash + banks)
      Array.from(accountCheckboxes).forEach((cb) => {
        cb.checked = cb.value === "cash" || cb.value === "banks";
      });

      // Reset categories
      if (categoryFilterEl) {
        Array.from(categoryFilterEl.options).forEach((opt) => {
          opt.selected = false;
        });
      }

      // Reset views
      if (viewSummaryEl) viewSummaryEl.checked = true;
      if (viewCategoryTableEl) viewCategoryTableEl.checked = true;
      if (viewAccountTableEl) viewAccountTableEl.checked = false;
      if (viewTrendChartEl) viewTrendChartEl.checked = true;
      if (viewDetailTableEl) viewDetailTableEl.checked = true;

      showEmpty(false);
    });
  }

  // ---------- Template buttons ----------

  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener("click", () => {
      const name = (templateNameInput?.value || "").trim();
      if (!name) {
        alert("Please enter a template name.");
        return;
      }
      const settings = captureCurrentSettings();
      const templates = loadTemplatesFromStorage();
      const existingIndex = templates.findIndex((t) => t.name === name);
      if (existingIndex >= 0) {
        templates[existingIndex] = { name, ...settings };
      } else {
        templates.push({ name, ...settings });
      }
      saveTemplatesToStorage(templates);
      refreshTemplateDropdown();
      alert("Report template saved.");
    });
  }

  if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener("click", () => {
      const index = savedSelect?.value;
      if (!index) return;
      const templates = loadTemplatesFromStorage();
      const tpl = templates[Number(index)];
      if (!tpl) return;
      applySettingsToUI(tpl);
    });
  }

  if (deleteTemplateBtn) {
    deleteTemplateBtn.addEventListener("click", () => {
      const index = savedSelect?.value;
      if (!index) return;
      const templates = loadTemplatesFromStorage();
      const tpl = templates[Number(index)];
      if (!tpl) return;
      if (!confirm(`Delete saved report "${tpl.name}"?`)) return;
      templates.splice(Number(index), 1);
      saveTemplatesToStorage(templates);
      refreshTemplateDropdown();
      if (templateNameInput) templateNameInput.value = "";
      alert("Template deleted.");
    });
  }

  // Initial auto-run for a quick default view
  if (generateBtn) {
    generateBtn.click();
  }
});
