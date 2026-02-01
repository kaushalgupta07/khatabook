// Report calculation functions - all aggregation logic for reports

/**
 * Get all transactions (including legacy expenses converted to pay transactions).
 */
async function getAllTransactionsForReports() {
  // Now purely async fetch from backend
  return await getTransactions();
}

/**
 * Filter transactions by date range.
 */
function filterTransactionsByDate(transactions, fromDate, toDate) {
  if (!fromDate && !toDate) return transactions;
  
  return transactions.filter((txn) => {
    if (!txn.date) return false;
    const d = new Date(txn.date);
    if (Number.isNaN(d.getTime())) return false;
    
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    
    return true;
  });
}

/**
 * Calculate Expense Summary Report data.
 * Returns: { totalExpense, categoryBreakdown }
 */
async function calculateExpenseSummaryReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  let filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  // Only include expense transactions
  filtered = filtered.filter((txn) => isExpenseTransaction(txn));
  
  const totals = calculateTotals(filtered);
  const categoryTotals = calculateCategoryTotals(filtered, "expense");
  
  return {
    totalExpense: totals.expense,
    categoryBreakdown: Array.from(categoryTotals.entries()).map(([category, data]) => ({
      category,
      totalAmount: data.expense,
    })),
  };
}

/**
 * Calculate Income Summary Report data.
 * Returns: { totalIncome, categoryBreakdown }
 */
async function calculateIncomeSummaryReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  let filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  // Only include income transactions
  filtered = filtered.filter((txn) => isIncomeTransaction(txn));
  
  const totals = calculateTotals(filtered);
  const categoryTotals = calculateCategoryTotals(filtered, "income");
  
  return {
    totalIncome: totals.income,
    categoryBreakdown: Array.from(categoryTotals.entries()).map(([category, data]) => ({
      category,
      totalAmount: data.income,
    })),
  };
}

/**
 * Calculate Category-wise Expenses Report data.
 * Returns: { categories }
 */
async function calculateCategoryWiseExpensesReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  let filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  // Only include expense transactions
  filtered = filtered.filter((txn) => isExpenseTransaction(txn));
  
  const categoryTotals = calculateCategoryTotals(filtered, "expense");
  
  return {
    categories: Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        category,
        totalSpent: data.expense,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent),
  };
}

/**
 * Calculate Account-wise Report data.
 * Returns: { accounts }
 */
async function calculateAccountWiseReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  const filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  const accountTotals = calculateAccountTotals(filtered);
  const allAccounts = getAllAccounts();
  
  // Get current balances (calculated from all transactions)
  const currentBalances = await getAccountBalances();
  
  return {
    accounts: Array.from(accountTotals.entries())
      .map(([accountId, data]) => {
        const account = allAccounts.find((a) => a.id === accountId);
        return {
          accountId,
          accountName: account ? account.name : accountId,
          accountIcon: account ? account.icon : "💼",
          openingBalance: account ? account.openingBalance || 0 : 0,
          inflow: data.inflow,
          outflow: data.outflow,
          currentBalance: currentBalances[accountId] || 0,
        };
      })
      .filter((acc) => acc.accountName) // Only show valid accounts
      .sort((a, b) => {
        // Sort by account order if available
        const accountA = allAccounts.find((acc) => acc.id === a.accountId);
        const accountB = allAccounts.find((acc) => acc.id === b.accountId);
        const orderA = accountA ? accountA.order || 999 : 999;
        const orderB = accountB ? accountB.order || 999 : 999;
        return orderA - orderB;
      }),
  };
}

/**
 * Calculate Monthly Trend Report data.
 * Returns: { months }
 */
async function calculateMonthlyTrendReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  const filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  const monthlyTotals = calculateMonthlyTotals(filtered);
  
  return {
    months: Array.from(monthlyTotals.entries())
      .map(([monthKey, data]) => ({
        month: monthKey,
        totalExpense: data.expense,
        totalIncome: data.income,
        net: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

/**
 * Calculate Detailed Transactions Report data.
 * Returns: { transactions }
 */
async function calculateDetailedTransactionsReport(fromDate = null, toDate = null) {
  const allTransactions = await getAllTransactionsForReports();
  const filtered = filterTransactionsByDate(allTransactions, fromDate, toDate);
  
  return {
    transactions: filtered
      .map((txn) => {
        const debitId = getAccountIdFromTransactionField(txn.debitAccount);
        const creditId = getAccountIdFromTransactionField(txn.creditAccount);
        
        return {
          id: txn.id,
          date: txn.date,
          type: getTransactionType(txn),
          category: txn.category || "Other",
          description: txn.description || "-",
          fromAccount: debitId ? getAccountDisplayName(debitId) : "-",
          toAccount: creditId ? getAccountDisplayName(creditId) : "-",
          amount: Number(txn.amount) || 0,
        };
      })
      .sort((a, b) => {
        // Sort by date descending (newest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      }),
  };
}
