// Data access layer for KhataBook.
// Handles API calls for transactions and localStorage for UI settings.
// After cloud migration: API is primary; localStorage only for UI preferences (accounts, categories).
const API_BASE_URL = "https://khatabook-production.up.railway.app/api";
const MIGRATION_DONE_KEY = "khatabook_cloud_migrated";
const STORAGE_KEY = "khatabook_expenses"; // Legacy support for old expense format
const ACCOUNT_NAMES_KEY = "khatabook_account_names"; // Legacy support for old account names
const ACCOUNT_CONFIG_KEY = "khatabook_account_config";
const CATEGORY_CONFIG_KEY = "khatabook_categories";

// Default account definitions (internal IDs - never change)
const DEFAULT_ACCOUNTS = [
  { id: "bank1", name: "Bank Balance 01", icon: "🏦", visible: true, order: 0, isDefault: true },
  { id: "bank2", name: "Bank Balance 02", icon: "🏦", visible: true, order: 1, isDefault: true },
  { id: "bank3", name: "Bank Balance 03", icon: "🏦", visible: true, order: 2, isDefault: true },
  { id: "cash", name: "Cash Balance", icon: "💵", visible: true, order: 3, isDefault: true },
  { id: "udhari", name: "Udhaari", icon: "📒", visible: true, order: 4, isDefault: true },
  { id: "advance", name: "Advance", icon: "💰", visible: true, order: 5, isDefault: true }
];

// Default categories for different transaction types
const DEFAULT_PAY_CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Other"];
const DEFAULT_RECEIVE_CATEGORIES = ["Salary", "Business", "Refund", "Gift", "Other"];

// --- AUTH HELPER ---
function getCurrentUser() {
  const userStr = localStorage.getItem("currentUser");
  return userStr ? JSON.parse(userStr) : null;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Get all account configurations (defaults + user created).
 * Returns array of account objects.
 */
function getAllAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNT_CONFIG_KEY);
    let userAccounts = [];
    if (raw) {
      try {
        userAccounts = JSON.parse(raw);
        if (!Array.isArray(userAccounts)) userAccounts = [];
      } catch (e) {
        console.error("Failed to parse account config", e);
      }
    }

    // Migrate legacy account names if they exist
    migrateLegacyAccountNames();

    // Merge defaults with user accounts
    const accountMap = new Map();
    
    // Add defaults first
    DEFAULT_ACCOUNTS.forEach(acc => {
      accountMap.set(acc.id, { ...acc });
    });

    // Override with user configs (preserve defaults that aren't overridden)
    userAccounts.forEach(userAcc => {
      if (userAcc.id && accountMap.has(userAcc.id)) {
        // Merge user config with default
        const defaultAcc = accountMap.get(userAcc.id);
        accountMap.set(userAcc.id, { ...defaultAcc, ...userAcc });
      } else if (userAcc.id) {
        // New user-created account
        // Ensure required fields
        if (!userAcc.name) userAcc.name = userAcc.id;
        if (!userAcc.icon) userAcc.icon = "💼";
        if (userAcc.visible === undefined) userAcc.visible = true;
        if (userAcc.order === undefined) userAcc.order = accountMap.size;
        accountMap.set(userAcc.id, userAcc);
      }
    });

    // Convert to array and sort by order
    const accounts = Array.from(accountMap.values());
    accounts.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return accounts;
  } catch (e) {
    console.error("Failed to get accounts", e);
    return [...DEFAULT_ACCOUNTS];
  }
}

/**
 * Migrate legacy account names to new system.
 */
function migrateLegacyAccountNames() {
  try {
    const legacyNames = getAccountNames();
    if (Object.keys(legacyNames).length === 0) return;
    
    const accounts = [];
    const legacyMap = {
      "Bank Balance 01": "bank1",
      "Bank Balance 02": "bank2",
      "Bank Balance 03": "bank3",
      "Cash Balance": "cash",
      "Udhaari": "udhari",
      "Advance": "advance"
    };
    
    Object.entries(legacyNames).forEach(([legacyName, customName]) => {
      const accountId = legacyMap[legacyName];
      if (accountId && customName && customName !== legacyName) {
        accounts.push({
          id: accountId,
          name: customName
        });
      }
    });
    
    if (accounts.length > 0) {
      const existingConfig = localStorage.getItem(ACCOUNT_CONFIG_KEY);
      let existingAccounts = [];
      if (existingConfig) {
        try {
          existingAccounts = JSON.parse(existingConfig);
          if (!Array.isArray(existingAccounts)) existingAccounts = [];
        } catch (e) {
          existingAccounts = [];
        }
      }
      
      // Merge migrations with existing
      accounts.forEach(migrated => {
        const existingIndex = existingAccounts.findIndex(a => a.id === migrated.id);
        if (existingIndex >= 0) {
          existingAccounts[existingIndex] = { ...existingAccounts[existingIndex], ...migrated };
        } else {
          existingAccounts.push(migrated);
        }
      });
      
      saveAccountConfig(existingAccounts);
    }
  } catch (e) {
    console.error("Failed to migrate legacy names", e);
  }
}

/**
 * Initialize account balances (stub for account-manager compatibility).
 * Balances are calculated from transactions; openingBalance is in account config.
 */
function initializeAccounts() {
  const balances = {};
  getAllAccounts().forEach((acc) => {
    balances[acc.id] = acc.openingBalance || 0;
  });
  return balances;
}

/**
 * Save account balances (no-op; balances derived from transactions + openingBalance in config).
 */
function saveAccounts() {
  /* no-op - compatibility stub */
}

/**
 * Save account configurations to localStorage.
 */
function saveAccountConfig(accounts) {
  try {
    // Only save user-created accounts and customizations
    const userAccounts = accounts.filter(acc => !acc.isDefault || acc.name !== getDefaultAccountName(acc.id) || acc.icon !== getDefaultAccountIcon(acc.id) || acc.visible === false || acc.order !== getDefaultAccountOrder(acc.id));
    localStorage.setItem(ACCOUNT_CONFIG_KEY, JSON.stringify(userAccounts));
  } catch (e) {
    console.error("Failed to save account config", e);
  }
}

/**
 * Get default account name by ID.
 */
function getDefaultAccountName(id) {
  const defaultAcc = DEFAULT_ACCOUNTS.find(a => a.id === id);
  return defaultAcc ? defaultAcc.name : id;
}

/**
 * Get default account icon by ID.
 */
function getDefaultAccountIcon(id) {
  const defaultAcc = DEFAULT_ACCOUNTS.find(a => a.id === id);
  return defaultAcc ? defaultAcc.icon : "💼";
}

/**
 * Get default account order by ID.
 */
function getDefaultAccountOrder(id) {
  const defaultAcc = DEFAULT_ACCOUNTS.find(a => a.id === id);
  return defaultAcc ? defaultAcc.order : 999;
}

/**
 * Get account by ID.
 */
function getAccountById(id) {
  const accounts = getAllAccounts();
  return accounts.find(acc => acc.id === id);
}

/**
 * Get visible accounts only (for dropdowns).
 */
function getVisibleAccounts() {
  return getAllAccounts().filter(acc => acc.visible !== false);
}

/**
 * Get account display name (with icon).
 */
function getAccountDisplayNameWithIcon(accountId) {
  const account = getAccountById(accountId);
  if (!account) return accountId;
  return `${account.icon || ""} ${account.name || accountId}`.trim();
}

/**
 * Get account display name (without icon).
 */
function getAccountDisplayName(accountId) {
  const account = getAccountById(accountId);
  if (!account) {
    // Fallback for legacy accounts
    return accountId;
  }
  return account.name || accountId;
}

/**
 * Get all expenses from localStorage.
 * Each expense: { id, date, category, description, amount }
 */
function getExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to read expenses from storage", e);
    return [];
  }
}

/**
 * Save full expense array to localStorage.
 */
function saveExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error("Failed to save expenses to storage", e);
  }
}

/**
 * Migrate legacy localStorage expenses to cloud on first login.
 * Converts old format to transactions and uploads via bulk API.
 */
async function migrateLocalStorageToCloud() {
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_DONE_KEY, "1");
    return;
  }

  let legacyExpenses = [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(MIGRATION_DONE_KEY, "1");
      return;
    }
    legacyExpenses = parsed;
  } catch (e) {
    localStorage.setItem(MIGRATION_DONE_KEY, "1");
    return;
  }

  // Convert legacy { id, date, category, description, amount } to transaction format
  const transactions = legacyExpenses.map((e) => ({
    date: e.date || new Date().toISOString().slice(0, 10),
    category: e.category || "Other",
    description: e.description || "",
    amount: Number(e.amount) || 0,
    debitAccount: "cash",
    creditAccount: "",
    type: "pay",
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/transactions/bulk`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ transactions }),
    });
    if (response.ok) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(MIGRATION_DONE_KEY, "1");
      console.log(`KhataBook: Migrated ${transactions.length} transactions to cloud.`);
    }
  } catch (err) {
    console.warn("Migration failed, will retry on next load:", err);
  }
}

/**
 * Get all transactions from API.
 * On first load after login, runs localStorage migration if needed.
 */
async function getTransactions() {
  const user = getCurrentUser();
  if (!user || !user.id) return [];

  // Run migration once if user has legacy localStorage data
  await migrateLocalStorageToCloud();

  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch transactions");
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
}

/**
 * Add a new transaction via the API.
 */
async function addTransaction(transaction) {
  const user = getCurrentUser();
  if (!user || !user.id) throw new Error("User not logged in");

  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(transaction),
  });

  if (!response.ok) throw new Error("Failed to save transaction");
  return await response.json();
}

/**
 * Update a transaction via the API.
 */
async function updateTransaction(id, updates) {
  const user = getCurrentUser();
  if (!user || !user.id) throw new Error("User not logged in");

  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error("Failed to update transaction");
  return await response.json();
}

/**
 * Delete a transaction via the API.
 */
async function deleteTransaction(id) {
  if (!id) return;
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete transaction");
  return true;
}

/**
 * Get account ID from transaction field (supports legacy account names).
 */
function getAccountIdFromTransactionField(field) {
  if (!field) return null;
  
  // Try direct match by ID
  const accountById = getAccountById(field);
  if (accountById) return field;
  
  // Try match by name (legacy support)
  const allAccounts = getAllAccounts();
  const accountByName = allAccounts.find(acc => acc.name === field);
  if (accountByName) return accountByName.id;
  
  // Legacy mapping
  const legacyMap = {
    "Bank Balance 01": "bank1",
    "Bank Balance 02": "bank2",
    "Bank Balance 03": "bank3",
    "Cash Balance": "cash",
    "Udhaari": "udhari",
    "Advance": "advance"
  };
  
  return legacyMap[field] || field;
}

/**
 * Get current account balances by fetching all transactions and calculating them.
 * Returns an object: { accountId: balance }
 */
async function getAccountBalances() {
  const transactions = await getTransactions();
  const accountTotals = calculateAccountTotals(transactions);
  
  const balances = {};
  accountTotals.forEach((data, accountId) => {
    balances[accountId] = data.balance;
  });
  
  return balances;
}

/**
 * Calculate net worth by summing all dynamic account balances.
 */
async function calculateNetWorth() {
  const accounts = await getAccountBalances();
  let netWorth = 0;
  Object.values(accounts).forEach(balance => {
    netWorth += Number(balance) || 0;
  });
  return netWorth;
}

/**
 * Add a single expense to localStorage (legacy support).
 */
function addExpense(expense) {
  const all = getExpenses();
  const withId = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), ...expense };
  all.unshift(withId);
  saveExpenses(all);
  return withId;
}

/**
 * Get custom display names for accounts from localStorage (legacy support).
 * Returns object mapping account key -> display name.
 */
function getAccountNames() {
  try {
    const raw = localStorage.getItem(ACCOUNT_NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch (e) {
    console.error("Failed to read account names from storage", e);
    return {};
  }
}

/**
 * Save custom display names for accounts to localStorage (legacy support).
 */
function saveAccountNames(names) {
  try {
    localStorage.setItem(ACCOUNT_NAMES_KEY, JSON.stringify(names));
  } catch (e) {
    console.error("Failed to save account names to storage", e);
  }
}

/**
 * Set custom display name for an account (legacy support).
 */
function setAccountDisplayName(accountKey, displayName) {
  // Convert legacy account name to ID
  const accountId = getAccountIdFromTransactionField(accountKey);
  if (!accountId) {
    console.error("Invalid account key:", accountKey);
    return false;
  }
  
  const account = getAccountById(accountId);
  if (!account) return false;
  
  const accounts = getAllAccounts();
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  if (accountIndex === -1) return false;
  
  accounts[accountIndex].name = displayName && displayName.trim() ? displayName.trim() : getDefaultAccountName(accountId);
  saveAccountConfig(accounts);
  return true;
}

/**
 * Utility: format amount as currency-like string.
 */
function formatAmount(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/**
 * Get default category configuration.
 */
function getDefaultCategoryConfig() {
  return {
    pay: [...DEFAULT_PAY_CATEGORIES],
    receive: [...DEFAULT_RECEIVE_CATEGORIES]
  };
}

/**
 * Get category configuration from localStorage.
 * Returns { pay: string[], receive: string[] }
 */
function getCategoryConfig() {
  try {
    const raw = localStorage.getItem(CATEGORY_CONFIG_KEY);
    if (!raw) return getDefaultCategoryConfig();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return getDefaultCategoryConfig();

    const pay = Array.isArray(parsed.pay) && parsed.pay.length ? parsed.pay : DEFAULT_PAY_CATEGORIES;
    const receive = Array.isArray(parsed.receive) && parsed.receive.length ? parsed.receive : DEFAULT_RECEIVE_CATEGORIES;

    return { pay, receive };
  } catch (e) {
    console.error("Failed to read categories from storage", e);
    return getDefaultCategoryConfig();
  }
}

/**
 * Save category configuration to localStorage.
 * Expects { pay: string[], receive: string[] }
 */
function saveCategoryConfig(config) {
  try {
    const base = getDefaultCategoryConfig();
    const normalized = {
      pay: Array.isArray(config.pay) && config.pay.length ? config.pay : base.pay,
      receive: Array.isArray(config.receive) && config.receive.length ? config.receive : base.receive
    };
    localStorage.setItem(CATEGORY_CONFIG_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error("Failed to save categories to storage", e);
  }
}

/**
 * Dispatch a custom event when categories are updated.
 */
function dispatchCategoriesUpdated() {
  try {
    window.dispatchEvent(new CustomEvent("categoriesUpdated"));
  } catch (e) {
    // In non-browser environments, ignore
  }
}

/**
 * Get normalized transaction type (pay/receive/transfer).
 */
function getTransactionType(txn) {
  if (!txn) return "";
  const t = txn.type || txn.transactionType || "";
  return String(t).toLowerCase();
}

/**
 * Check if transaction is expense (pay).
 */
function isExpenseTransaction(txn) {
  return getTransactionType(txn) === "pay";
}

/**
 * Check if transaction is income (receive).
 */
function isIncomeTransaction(txn) {
  return getTransactionType(txn) === "receive";
}

/**
 * Calculate totals (expense, income, net) from transactions.
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} { expense, income, net }
 */
function calculateTotals(transactions) {
  let expense = 0;
  let income = 0;

  transactions.forEach((txn) => {
    const amount = Number(txn.amount) || 0;
    if (isExpenseTransaction(txn)) {
      expense += amount;
    } else if (isIncomeTransaction(txn)) {
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

/**
 * Calculate category-wise totals from transactions.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} typeFilter - 'expense', 'income', or null for both
 * @returns {Map} Map of category -> { expense, income, total }
 */
function calculateCategoryTotals(transactions, typeFilter = null) {
  const map = new Map();

  transactions.forEach((txn) => {
    const category = txn.category || "Other";
    const amount = Number(txn.amount) || 0;
    const entry = map.get(category) || { expense: 0, income: 0, total: 0 };

    if (isExpenseTransaction(txn)) {
      entry.expense += amount;
      entry.total += amount;
    } else if (isIncomeTransaction(txn)) {
      entry.income += amount;
      entry.total += amount;
    }

    map.set(category, entry);
  });

  // Filter by type if specified
  if (typeFilter === "expense") {
    const filtered = new Map();
    map.forEach((value, key) => {
      if (value.expense > 0) {
        filtered.set(key, { expense: value.expense, income: 0, total: value.expense });
      }
    });
    return filtered;
  } else if (typeFilter === "income") {
    const filtered = new Map();
    map.forEach((value, key) => {
      if (value.income > 0) {
        filtered.set(key, { expense: 0, income: value.income, total: value.income });
      }
    });
    return filtered;
  }

  return map;
}

/**
 * Calculate account-wise totals (inflow, outflow, balance).
 * @param {Array} transactions - Array of transaction objects
 * @returns {Map} Map of accountId -> { inflow, outflow, balance }
 */
function calculateAccountTotals(transactions) {
  const map = new Map();
  const allAccounts = getAllAccounts();

  // Initialize all accounts
  allAccounts.forEach((acc) => {
    map.set(acc.id, {
      inflow: 0,
      outflow: 0,
      balance: acc.openingBalance || 0,
    });
  });

  transactions.forEach((txn) => {
    const amount = Number(txn.amount) || 0;
    const debitId = getAccountIdFromTransactionField(txn.debitAccount);
    const creditId = getAccountIdFromTransactionField(txn.creditAccount);

    if (isExpenseTransaction(txn)) {
      // Pay: money goes out from debit account
      if (debitId && map.has(debitId)) {
        const entry = map.get(debitId);
        entry.outflow += amount;
        entry.balance -= amount;
      }
    } else if (isIncomeTransaction(txn)) {
      // Receive: money comes into credit account
      if (creditId && map.has(creditId)) {
        const entry = map.get(creditId);
        entry.inflow += amount;
        entry.balance += amount;
      }
    } else if (getTransactionType(txn) === "transfer") {
      // Transfers affect balances but not net worth
      if (debitId && map.has(debitId)) map.get(debitId).balance -= amount;
      if (creditId && map.has(creditId)) map.get(creditId).balance += amount;
    }
  });

  return map;
}

/**
 * Calculate monthly totals (expense and income per month).
 * @param {Array} transactions - Array of transaction objects
 * @returns {Map} Map of "YYYY-MM" -> { expense, income }
 */
function calculateMonthlyTotals(transactions) {
  const map = new Map();

  transactions.forEach((txn) => {
    if (!txn.date) return;
    const d = new Date(txn.date);
    if (Number.isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) || { expense: 0, income: 0 };
    const amount = Number(txn.amount) || 0;

    if (isExpenseTransaction(txn)) {
      entry.expense += amount;
    } else if (isIncomeTransaction(txn)) {
      entry.income += amount;
    }

    map.set(key, entry);
  });

  return map;
}

// --- Expose shared helpers globally for plain <script> usage (dashboard, add, report) ---
(function () {
  window.getCurrentUser = getCurrentUser;
  window.getAuthHeaders = getAuthHeaders;
  window.getAllAccounts = getAllAccounts;
  window.migrateLegacyAccountNames = migrateLegacyAccountNames;
  window.initializeAccounts = initializeAccounts;
  window.saveAccounts = saveAccounts;
  window.saveAccountConfig = saveAccountConfig;
  window.getDefaultAccountName = getDefaultAccountName;
  window.getDefaultAccountIcon = getDefaultAccountIcon;
  window.getDefaultAccountOrder = getDefaultAccountOrder;
  window.getAccountById = getAccountById;
  window.getVisibleAccounts = getVisibleAccounts;
  window.getAccountDisplayNameWithIcon = getAccountDisplayNameWithIcon;
  window.getAccountDisplayName = getAccountDisplayName;
  window.getExpenses = getExpenses;
  window.saveExpenses = saveExpenses;
  window.migrateLocalStorageToCloud = migrateLocalStorageToCloud;
  window.getTransactions = getTransactions;
  window.addTransaction = addTransaction;
  window.updateTransaction = updateTransaction;
  window.deleteTransaction = deleteTransaction;
  window.getAccountIdFromTransactionField = getAccountIdFromTransactionField;
  window.getAccountBalances = getAccountBalances;
  window.calculateNetWorth = calculateNetWorth;
  window.addExpense = addExpense;
  window.getAccountNames = getAccountNames;
  window.saveAccountNames = saveAccountNames;
  window.setAccountDisplayName = setAccountDisplayName;
  window.formatAmount = formatAmount;
  window.getDefaultCategoryConfig = getDefaultCategoryConfig;
  window.getCategoryConfig = getCategoryConfig;
  window.saveCategoryConfig = saveCategoryConfig;
  window.dispatchCategoriesUpdated = dispatchCategoriesUpdated;
  window.getTransactionType = getTransactionType;
  window.isExpenseTransaction = isExpenseTransaction;
  window.isIncomeTransaction = isIncomeTransaction;
  window.calculateTotals = calculateTotals;
  window.calculateCategoryTotals = calculateCategoryTotals;
  window.calculateAccountTotals = calculateAccountTotals;
  window.calculateMonthlyTotals = calculateMonthlyTotals;
})();
