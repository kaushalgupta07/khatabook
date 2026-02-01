// Reports navigation and routing

document.addEventListener("DOMContentLoaded", () => {
  const homeSection = document.getElementById("report-home");
  const workspaceSection = document.getElementById("report-workspace");
  const breadcrumbEl = document.getElementById("report-breadcrumb");
  const backBtn = document.getElementById("report-back-btn");
  const cards = document.querySelectorAll(".kb-report-type-card");

  // Map legacy report types to new report types
  const reportTypeMap = {
    expense: "expense-summary",
    income: "income-summary",
    category: "category-expense",
    account: "account-summary",
    monthly: "monthly-trend",
    detailed: "detailed",
  };

  function getReportLabel(reportType) {
    const labels = {
      "expense-summary": "Expense Summary",
      "income-summary": "Income Summary",
      "category-expense": "Category-wise Expenses",
      "account-summary": "Account-wise Report",
      "monthly-trend": "Monthly Trend",
      "detailed": "Detailed Transactions",
    };
    return labels[reportType] || "Report";
  }

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function setQueryParam(name, value) {
    const url = new URL(window.location);
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
    window.history.pushState({}, "", url);
  }

  function loadReport(reportType) {
    if (!reportType) return;

    showReportLoading(true);
    showReportEmpty(false);

    // Update URL
    setQueryParam("type", reportType);

    // Show workspace
    if (homeSection) homeSection.style.display = "none";
    if (workspaceSection) workspaceSection.style.display = "";

    if (breadcrumbEl) {
      breadcrumbEl.textContent = `Reports > ${getReportLabel(reportType)}`;
    }

    // Calculate and render report (async - getTransactions is API call)
    (async () => {
      try {
        let data = null;

        switch (reportType) {
          case "expense-summary":
            data = await calculateExpenseSummaryReport();
            break;
          case "income-summary":
            data = await calculateIncomeSummaryReport();
            break;
          case "category-expense":
            data = await calculateCategoryWiseExpensesReport();
            break;
          case "account-summary":
            data = await calculateAccountWiseReport();
            break;
          case "monthly-trend":
            data = await calculateMonthlyTrendReport();
            break;
          case "detailed":
            data = await calculateDetailedTransactionsReport();
            break;
          default:
            showReportEmpty(true, "Unknown report type.");
            showReportLoading(false);
            return;
        }

        renderReport(reportType, data);
      } catch (error) {
        console.error("Error loading report:", error);
        showReportEmpty(true, "Error loading report. Please try again.");
      } finally {
        showReportLoading(false);
      }
    })();
  }

  // Handle card clicks
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const reportType = card.getAttribute("data-report-type");
      if (reportType) {
        loadReport(reportType);
      } else {
        // Fallback to legacy data-report attribute
        const legacyType = card.getAttribute("data-report");
        if (legacyType && reportTypeMap[legacyType]) {
          loadReport(reportTypeMap[legacyType]);
        }
      }
    });
  });

  // Handle back button
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      setQueryParam("type", null);
      if (workspaceSection) workspaceSection.style.display = "none";
      if (homeSection) homeSection.style.display = "";
      if (breadcrumbEl) breadcrumbEl.textContent = "Reports";
    });
  }

  // Check for query param on load
  const reportType = getQueryParam("type");
  if (reportType) {
    loadReport(reportType);
  }
});

