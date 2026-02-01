// Account Manager UI Logic

let accountManagerModal = null;
let accountListContainer = null;
let isDragging = false;
let draggedElement = null;

/**
 * Initialize account manager modal.
 */
function initAccountManager() {
  accountManagerModal = document.getElementById("account-manager-modal");
  accountListContainer = document.getElementById("account-list-container");
  
  const openBtn = document.getElementById("open-account-manager");
  const closeBtn = document.getElementById("close-account-manager");
  const addAccountBtn = document.getElementById("add-account-btn");
  
  if (openBtn) {
    openBtn.addEventListener("click", () => openAccountManager());
  }
  
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeAccountManager());
  }
  
  if (addAccountBtn) {
    addAccountBtn.addEventListener("click", () => showAddAccountForm());
  }
  
  // Close modal on backdrop click
  if (accountManagerModal) {
    accountManagerModal.addEventListener("click", (e) => {
      if (e.target === accountManagerModal) {
        closeAccountManager();
      }
    });
  }
  
  // Render initial list
  renderAccountList();
}

/**
 * Open account manager modal.
 */
function openAccountManager() {
  if (accountManagerModal) {
    accountManagerModal.style.display = "flex";
    renderAccountList();
  }
}

/**
 * Close account manager modal.
 */
function closeAccountManager() {
  if (accountManagerModal) {
    accountManagerModal.style.display = "none";
  }
}

/**
 * Render account list in modal.
 */
function renderAccountList() {
  if (!accountListContainer) return;
  
  const accounts = getAllAccounts();
  accountListContainer.innerHTML = "";
  
  if (accounts.length === 0) {
    accountListContainer.innerHTML = '<p class="kb-empty">No accounts found.</p>';
    return;
  }
  
  accounts.forEach((account, index) => {
    const accountItem = createAccountItem(account, index);
    accountListContainer.appendChild(accountItem);
  });
  
  // Attach event listeners
  attachAccountItemListeners();
}

/**
 * Create account item element.
 */
function createAccountItem(account, index) {
  const item = document.createElement("div");
  item.className = "account-manager-item";
  item.draggable = true;
  item.dataset.accountId = account.id;
  item.dataset.index = index;
  
  const iconDisplay = account.icon || "💼";
  const nameDisplay = account.name || account.id;
  const isVisible = account.visible !== false;
  
  item.innerHTML = `
    <div class="account-item-drag-handle">☰</div>
    <div class="account-item-icon-edit">
      <span class="account-item-icon">${iconDisplay}</span>
      <button type="button" class="btn-icon-edit" data-account-id="${account.id}" title="Edit icon">
        ✏️
      </button>
    </div>
    <div class="account-item-info">
      <div class="account-item-name">${nameDisplay}</div>
      <div class="account-item-meta">
        <span class="account-item-id">ID: ${account.id}</span>
        ${account.isDefault ? '<span class="account-item-badge">Default</span>' : ''}
      </div>
    </div>
    <div class="account-item-controls">
      <label class="toggle-switch">
        <input type="checkbox" ${isVisible ? 'checked' : ''} data-account-id="${account.id}" class="toggle-visibility">
        <span class="toggle-slider"></span>
      </label>
      <button type="button" class="btn-edit-name" data-account-id="${account.id}" title="Edit name">
        ✏️ Name
      </button>
      ${!account.isDefault ? `<button type="button" class="btn-delete-account" data-account-id="${account.id}" title="Delete account">🗑️</button>` : ''}
    </div>
  `;
  
  return item;
}

/**
 * Attach event listeners to account items.
 */
function attachAccountItemListeners() {
  // Icon edit
  document.querySelectorAll(".btn-icon-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const accountId = btn.getAttribute("data-account-id");
      editAccountIcon(accountId);
    });
  });
  
  // Name edit
  document.querySelectorAll(".btn-edit-name").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const accountId = btn.getAttribute("data-account-id");
      editAccountName(accountId);
    });
  });
  
  // Visibility toggle
  document.querySelectorAll(".toggle-visibility").forEach(toggle => {
    toggle.addEventListener("change", (e) => {
      const accountId = toggle.getAttribute("data-account-id");
      toggleAccountVisibility(accountId, toggle.checked);
    });
  });
  
  // Delete account
  document.querySelectorAll(".btn-delete-account").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const accountId = btn.getAttribute("data-account-id");
      deleteAccount(accountId);
    });
  });
  
  // Drag and drop
  document.querySelectorAll(".account-manager-item").forEach(item => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("drop", handleDrop);
    item.addEventListener("dragend", handleDragEnd);
  });
}

/**
 * Edit account icon.
 */
function editAccountIcon(accountId) {
  const account = getAccountById(accountId);
  if (!account) return;
  
  const currentIcon = account.icon || "💼";
  const newIcon = prompt(`Enter emoji/icon for "${account.name}":`, currentIcon);
  
  if (newIcon !== null && newIcon.trim()) {
    updateAccountProperty(accountId, "icon", newIcon.trim());
    showToastMessage("Icon updated!");
    renderAccountList();
    refreshAccountDropdowns();
  }
}

/**
 * Edit account name.
 */
function editAccountName(accountId) {
  const account = getAccountById(accountId);
  if (!account) return;
  
  const currentName = account.name || accountId;
  const newName = prompt(`Enter new name for account:`, currentName);
  
  if (newName !== null && newName.trim()) {
    updateAccountProperty(accountId, "name", newName.trim());
    showToastMessage("Name updated!");
    renderAccountList();
    refreshAccountDropdowns();
  }
}

/**
 * Toggle account visibility.
 */
function toggleAccountVisibility(accountId, visible) {
  updateAccountProperty(accountId, "visible", visible);
  showToastMessage(visible ? "Account is now visible" : "Account is now hidden");
  renderAccountList();
  refreshAccountDropdowns();
}

/**
 * Update account property.
 */
function updateAccountProperty(accountId, property, value) {
  const accounts = getAllAccounts();
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  
  if (accountIndex === -1) return false;
  
  accounts[accountIndex][property] = value;
  saveAccountConfig(accounts);
  return true;
}

/**
 * Delete account (only user-created).
 */
function deleteAccount(accountId) {
  const account = getAccountById(accountId);
  if (!account) return;
  
  if (account.isDefault) {
    alert("Default accounts cannot be deleted.");
    return;
  }
  
  if (!confirm(`Are you sure you want to delete "${account.name}"?\n\nThis will hide it from dropdowns, but existing transactions will remain.`)) {
    return;
  }
  
  const accounts = getAllAccounts();
  const filtered = accounts.filter(a => a.id !== accountId);
  
  // Update order for remaining accounts
  filtered.forEach((acc, index) => {
    acc.order = index;
  });
  
  saveAccountConfig(filtered);
  showToastMessage("Account deleted!");
  renderAccountList();
  refreshAccountDropdowns();
}

/**
 * Show add account form.
 */
function showAddAccountForm() {
  const name = prompt("Enter account name:", "");
  if (!name || !name.trim()) return;
  
  const icon = prompt("Enter emoji/icon (optional):", "💼");
  const iconValue = icon ? icon.trim() : "💼";
  
  const openingBalanceStr = prompt("Enter opening balance (optional, default: 0):", "0");
  const openingBalance = openingBalanceStr ? parseFloat(openingBalanceStr) || 0 : 0;
  
  // Generate unique ID
  const accounts = getAllAccounts();
  let newId = `account_${Date.now()}`;
  let counter = 1;
  while (accounts.some(a => a.id === newId)) {
    newId = `account_${Date.now()}_${counter}`;
    counter++;
  }
  
  const newAccount = {
    id: newId,
    name: name.trim(),
    icon: iconValue,
    visible: true,
    order: accounts.length,
    isDefault: false,
    openingBalance: openingBalance
  };
  
  accounts.push(newAccount);
  saveAccountConfig(accounts);
  
  // Initialize balance if opening balance provided
  if (openingBalance !== 0) {
    const balances = initializeAccounts();
    balances[newId] = openingBalance;
    saveAccounts(balances);
  }
  
  showToastMessage("Account created!");
  renderAccountList();
  refreshAccountDropdowns();
}

/**
 * Drag and drop handlers.
 */
function handleDragStart(e) {
  isDragging = true;
  draggedElement = this;
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = "move";
  
  const afterElement = getDragAfterElement(accountListContainer, e.clientY);
  const dragging = document.querySelector(".dragging");
  
  if (afterElement == null) {
    accountListContainer.appendChild(dragging);
  } else {
    accountListContainer.insertBefore(dragging, afterElement);
  }
  
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedElement !== this) {
    const accounts = getAllAccounts();
    const draggedId = draggedElement.dataset.accountId;
    const targetId = this.dataset.accountId;
    
    const draggedIndex = accounts.findIndex(a => a.id === draggedId);
    const targetIndex = accounts.findIndex(a => a.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Reorder accounts
      const [removed] = accounts.splice(draggedIndex, 1);
      accounts.splice(targetIndex, 0, removed);
      
      // Update order values
      accounts.forEach((acc, index) => {
        acc.order = index;
      });
      
      saveAccountConfig(accounts);
      renderAccountList();
      refreshAccountDropdowns();
    }
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove("dragging");
  isDragging = false;
  draggedElement = null;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".account-manager-item:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Refresh account dropdowns (call after account changes).
 */
function refreshAccountDropdowns() {
  // Trigger custom event for other scripts to listen
  window.dispatchEvent(new CustomEvent("accountsUpdated"));
}

/**
 * Show toast message.
 */
function showToastMessage(message) {
  // Create toast element if it doesn't exist
  let toast = document.querySelector(".account-manager-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "account-manager-toast toast";
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountManager);
} else {
  initAccountManager();
}
