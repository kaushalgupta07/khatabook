// Dashboard logic

document.addEventListener("DOMContentLoaded", async () => {
  // --- DOM Elements ---
  const totalExpenseEl = document.getElementById("total-expense");
  const monthlyExpenseEl = document.getElementById("monthly-expense");
  const transactionListBody = document.getElementById("expense-list");
  const accountBalancesContainer = document.getElementById("account-balances");
  const netWorthEl = document.getElementById("net-worth");

  // --- Main Initialization Function ---
  async function initializeDashboard() {
    // 1. Fetch all necessary data asynchronously
    const [transactions, balances, netWorth, legacyExpenses] = await Promise.all([
      getTransactions(),
      getAccountBalances(),
      calculateNetWorth(),
      getExpenses() // For backward compatibility
    ]);

    // 2. Render UI components with the fetched data
    renderSummaryCards(transactions, legacyExpenses);
    renderTransactionList(transactions);
    renderAccountBalances(balances);
    renderNetWorth(netWorth);
  }

  /**
   * Renders the summary cards (Total and Monthly Expenses).
   */
  function renderSummaryCards(transactions, legacyExpenses) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let monthly = 0;

    // Calculate from API transactions
    const payTransactions = transactions.filter(isExpenseTransaction);
    payTransactions.forEach((txn) => {
      const amount = Number(txn.amount) || 0;
      total += amount;

      const d = txn.date ? new Date(txn.date) : null;
      if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthly += amount;
      }
    });

    // Add legacy expenses for backward compatibility
    legacyExpenses.forEach((exp) => {
      const amount = Number(exp.amount) || 0;
      total += amount;

      const d = exp.date ? new Date(exp.date) : null;
      if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthly += amount;
      }
    });

    if (totalExpenseEl) totalExpenseEl.textContent = `₹${formatAmount(total)}`;
    if (monthlyExpenseEl) monthlyExpenseEl.textContent = `₹${formatAmount(monthly)}`;
  }

  /**
   * Renders the list of recent transactions.
   */
  function renderTransactionList(transactions) {
    if (!transactionListBody) return;

    if (!transactions || transactions.length === 0) {
      transactionListBody.innerHTML = `<tr><td colspan="5" class="kb-empty">No transactions yet. Start by adding one.</td></tr>`;
      return;
    }

    const rowsHtml = transactions
      .slice(0, 15) // Show latest 15 transactions on dashboard
      .map((txn) => {
        const amount = Number(txn.amount) || 0;
        const debitId = getAccountIdFromTransactionField(txn.debitAccount);
        const creditId = getAccountIdFromTransactionField(txn.creditAccount);

        return `<tr>
          <td>${txn.date || "-"}</td>
          <td><span class="kb-pill">${txn.category || "Other"}</span></td>
          <td>${txn.description || "-"}</td>
          <td>${debitId ? getAccountDisplayNameWithIcon(debitId) : "-"} → ${creditId ? getAccountDisplayNameWithIcon(creditId) : "-"}</td>
          <td class="kb-amount">₹${formatAmount(amount)}</td>
        </tr>`;
      })
      .join("");

    transactionListBody.innerHTML = rowsHtml;
  }

  /**
   * Renders the account balance cards.
   */
  function renderAccountBalances(balances) {
    if (!accountBalancesContainer) return;

    const visibleAccounts = getVisibleAccounts();
    const accountsHtml = visibleAccounts
      .map(account => {
        const balanceNum = Number(balances[account.id] || 0);
        return `
          <div class="account-item">
            <span class="account-name">${getAccountDisplayNameWithIcon(account.id)}</span>
            <span class="account-balance ${balanceNum < 0 ? "negative" : ""}">₹${formatAmount(balanceNum)}</span>
          </div>
        `;
      })
      .join("");
    accountBalancesContainer.innerHTML = accountsHtml || "<p class='kb-empty'>No accounts configured.</p>";
  }

  /**
   * Renders the Net Worth card.
   */
  function renderNetWorth(netWorth) {
    if (!netWorthEl) return;
    netWorthEl.className = netWorth < 0 ? "negative" : "";
    netWorthEl.textContent = `₹${formatAmount(netWorth)}`;
  }

  // --- Run Initialization ---
  initializeDashboard();
});
