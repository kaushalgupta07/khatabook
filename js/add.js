// Add expense page logic

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("expense-form");
  const toast = createToast();
  const DEFAULT_WALLET = "cash"; // Use account ID instead of name

  // Default date: today
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const typeSelect = document.getElementById("transactionType");
  const debitSelect = document.getElementById("debitAccount");
  const creditSelect = document.getElementById("creditAccount");
  const categorySelect = document.getElementById("category");
  const categoryFormGroup = categorySelect ? categorySelect.closest(".form-group") : null;
  const descriptionInput = document.getElementById("description");

  /**
   * Populate account dropdown with visible accounts.
   * Value is account ID, text shows icon + name.
   */
  function populateAccountDropdown(selectEl) {
    if (!selectEl) return;
    const currentValue = selectEl.value;
    
    // Clear existing options except the first "Select account" option
    while (selectEl.options.length > 1) {
      selectEl.remove(1);
    }

    // Get visible accounts (sorted by order)
    const visibleAccounts = getVisibleAccounts();
    
    visibleAccounts.forEach(account => {
      const displayText = getAccountDisplayNameWithIcon(account.id);
      const option = document.createElement("option");
      option.value = account.id; // Use account ID as value
      option.textContent = displayText; // Show icon + name
      selectEl.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (currentValue) {
      // Try to find account by ID or legacy name
      const accountId = getAccountIdFromTransactionField(currentValue);
      setSelectValue(selectEl, accountId);
    }
  }


  // Initialize dropdowns with accounts
  populateAccountDropdown(debitSelect);
  populateAccountDropdown(creditSelect);
  
  // Listen for account updates
  window.addEventListener("accountsUpdated", () => {
    populateAccountDropdown(debitSelect);
    populateAccountDropdown(creditSelect);
  });

  const debitLabel = document.getElementById("debitLabel");
  const creditLabel = document.getElementById("creditLabel");
  const descriptionLabel = document.getElementById("descriptionLabel");

  const debitHelp = document.getElementById("debitHelp");
  const creditHelp = document.getElementById("creditHelp");
  const descriptionHelp = document.getElementById("descriptionHelp");
  const typeHelp = document.getElementById("typeHelp");

  /**
   * Category helpers
   */
  function getEffectiveCategoryConfig() {
    if (typeof getCategoryConfig === "function") {
      return getCategoryConfig();
    }
    // Fallback to defaults if helper not available
    return {
      pay: ["Food", "Transport", "Bills", "Shopping", "Other"],
      receive: ["Salary", "Business", "Refund", "Gift", "Other"]
    };
  }

  function updateCategoryDropdown(type) {
    if (!categorySelect) return;

    const config = getEffectiveCategoryConfig();
    let categories = [];

    if (type === "receive") {
      categories = config.receive || [];
    } else if (type === "pay") {
      categories = config.pay || [];
    } else {
      categories = []; // transfer: categories are hidden/disabled
    }

    // Reset options
    categorySelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select category";
    categorySelect.appendChild(placeholder);

    categories.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      categorySelect.appendChild(opt);
    });

    const isTransfer = type === "transfer";
    categorySelect.disabled = isTransfer;
    categorySelect.required = !isTransfer;
    if (categoryFormGroup) {
      categoryFormGroup.classList.toggle("form-group-disabled", isTransfer);
    }
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const hasOption = Array.from(selectEl.options).some((opt) => opt.value === value);
    selectEl.value = hasOption ? value : "";
  }

  function setFieldState(fieldEl, { disabled, required, value } = {}) {
    if (!fieldEl) return;
    if (typeof disabled === "boolean") fieldEl.disabled = disabled;
    if (typeof required === "boolean") fieldEl.required = required;
    if (typeof value === "string") fieldEl.value = value;
  }

  function enforceDifferentAccounts(changedEl) {
    if (!debitSelect || !creditSelect) return;
    if (debitSelect.disabled || creditSelect.disabled) return;

    const debit = debitSelect.value.trim();
    const credit = creditSelect.value.trim();
    if (!debit || !credit) return;

    if (debit === credit) {
      if (changedEl) changedEl.value = "";
      showToast(toast, "From and To accounts must be different.");
    }
  }

  function applyTransactionTypeUI(type) {
    // Defaults: enable both, then override per type
    setFieldState(debitSelect, { disabled: false, required: false });
    setFieldState(creditSelect, { disabled: false, required: false });
    setFieldState(descriptionInput, { disabled: false, required: false });

    if (type === "receive") {
      if (typeHelp) typeHelp.textContent = "Receive money into your Cash/Bank. We'll auto-handle the other side.";

      if (debitLabel) debitLabel.textContent = "From (external) — not needed";
      if (debitHelp) debitHelp.textContent = "Just enter who you received from below. This field is disabled to keep it simple.";
      setFieldState(debitSelect, { disabled: true, required: false, value: "" });

      if (creditLabel) creditLabel.textContent = "To (your account)";
      if (creditHelp) creditHelp.textContent = "Choose where you received money: Cash Balance or a Bank Balance.";
      setFieldState(creditSelect, { disabled: false, required: true });
      if (!creditSelect.value) setSelectValue(creditSelect, DEFAULT_WALLET);

      if (descriptionLabel) descriptionLabel.textContent = "Received from";
      descriptionInput.placeholder = "Received from...";
      if (descriptionHelp) descriptionHelp.textContent = "Enter the person/shop you received money from.";
      setFieldState(descriptionInput, { required: true });
      return;
    }

    if (type === "pay") {
      if (typeHelp) typeHelp.textContent = "Pay from your Cash/Bank. We'll auto-handle the other side.";

      if (debitLabel) debitLabel.textContent = "From (your account)";
      if (debitHelp) debitHelp.textContent = "Choose which account you paid from: Cash Balance or a Bank Balance.";
      setFieldState(debitSelect, { disabled: false, required: true });
      if (!debitSelect.value) setSelectValue(debitSelect, DEFAULT_WALLET);

      if (creditLabel) creditLabel.textContent = "To (external) — not needed";
      if (creditHelp) creditHelp.textContent = "Just enter who you paid to below. This field is disabled to keep it simple.";
      setFieldState(creditSelect, { disabled: true, required: false, value: "" });

      if (descriptionLabel) descriptionLabel.textContent = "Paid to";
      descriptionInput.placeholder = "Paid to...";
      if (descriptionHelp) descriptionHelp.textContent = "Enter the person/shop you paid.";
      setFieldState(descriptionInput, { required: true });
      return;
    }

    // transfer
    if (typeHelp) typeHelp.textContent = "Transfer between your own accounts (example: Cash → Bank).";

    if (debitLabel) debitLabel.textContent = "From account";
    if (debitHelp) debitHelp.textContent = "Select the account money goes out from.";
    setFieldState(debitSelect, { disabled: false, required: true });

    if (creditLabel) creditLabel.textContent = "To account";
    if (creditHelp) creditHelp.textContent = "Select the account money goes into.";
    setFieldState(creditSelect, { disabled: false, required: true });

    if (descriptionLabel) descriptionLabel.textContent = "Transfer note (optional)";
    descriptionInput.placeholder = "Transfer from...";
    if (descriptionHelp) descriptionHelp.textContent = "Optional: add a short note (example: \"Cash to Bank\").";
    setFieldState(descriptionInput, { required: false });
  }

  // Init UI
  applyTransactionTypeUI(typeSelect ? typeSelect.value : "pay");
  updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");

  // React to category config changes from other parts of the app
  window.addEventListener("categoriesUpdated", () => {
    updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");
  });

  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      applyTransactionTypeUI(typeSelect.value);
      updateCategoryDropdown(typeSelect.value);
      enforceDifferentAccounts();
    });
  }

  if (debitSelect) debitSelect.addEventListener("change", () => enforceDifferentAccounts(debitSelect));
  if (creditSelect) creditSelect.addEventListener("change", () => enforceDifferentAccounts(creditSelect));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = typeSelect ? typeSelect.value : "pay";
    const debitAccount = debitSelect && !debitSelect.disabled ? debitSelect.value.trim() : "";
    const creditAccount = creditSelect && !creditSelect.disabled ? creditSelect.value.trim() : "";
    let category = categorySelect ? categorySelect.value.trim() : "";
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const amountStr = document.getElementById("amount").value;
    const date = document.getElementById("date").value;

    // For transfers, auto-label category if missing while keeping logic simple
    if (type === "transfer" && !category) {
      category = "Transfer";
    }

    if (!type || !amountStr || !date || (!category && type !== "transfer")) {
      showToast(toast, "Please fill all required fields.");
      return;
    }

    const amount = Number(amountStr);
    if (!amount || amount <= 0) {
      showToast(toast, "Amount must be greater than zero.");
      return;
    }

    // Type-specific validation (simple & friendly)
    if (type === "receive") {
      if (!creditAccount || !description) {
        showToast(toast, "Select your Cash/Bank and enter who you received from.");
        return;
      }
    } else if (type === "pay") {
      if (!debitAccount || !description) {
        showToast(toast, "Select your Cash/Bank and enter who you paid to.");
        return;
      }
    } else if (type === "transfer") {
      if (!debitAccount || !creditAccount) {
        showToast(toast, "Select both From and To accounts for a transfer.");
        return;
      }
      if (debitAccount === creditAccount) {
        showToast(toast, "From and To accounts must be different.");
        return;
      }
    }

    // Add transaction with account information
    try {
      await addTransaction({ 
        date, 
        category, 
        description, 
        amount, 
        debitAccount, 
        creditAccount,
        type
      });
      showToast(toast, "Transaction saved.");
      form.reset();
    } catch (error) {
      console.error(error);
      showToast(toast, "Error saving transaction.");
    }

    if (dateInput && !dateInput.value) {
      dateInput.value = date;
    }

    // Restore default type UX after reset
    if (typeSelect) typeSelect.value = type;
    applyTransactionTypeUI(typeSelect ? typeSelect.value : "pay");
    updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");
  });

  /**
   * Category Manager (Customize Categories) UI
   */
  const categoryManagerModal = document.getElementById("category-manager-modal");
  const openCategoryManagerBtn = document.getElementById("open-category-manager");
  const closeCategoryManagerBtn = document.getElementById("close-category-manager");
  const categoryTabs = document.querySelectorAll(".category-tab");
  const categoryListContainer = document.getElementById("category-list-container");
  const addCategoryBtn = document.getElementById("add-category-btn");
  const newCategoryInput = document.getElementById("new-category-input");

  let activeCategoryType = "pay";

  function openCategoryManager() {
    if (!categoryManagerModal) return;
    categoryManagerModal.style.display = "flex";
    renderCategoryList();
  }

  function closeCategoryManager() {
    if (!categoryManagerModal) return;
    categoryManagerModal.style.display = "none";
  }

  function setActiveCategoryTab(type) {
    activeCategoryType = type === "receive" ? "receive" : "pay";
    categoryTabs.forEach((tab) => {
      const tabType = tab.getAttribute("data-category-tab");
      tab.classList.toggle("active", tabType === activeCategoryType);
    });
    renderCategoryList();
  }

  function renderCategoryList() {
    if (!categoryListContainer) return;
    const config = getEffectiveCategoryConfig();
    const list = activeCategoryType === "receive" ? config.receive : config.pay;

    categoryListContainer.innerHTML = "";

    if (!list || list.length === 0) {
      categoryListContainer.innerHTML = '<p class="kb-empty">No categories yet. Add one above.</p>';
      return;
    }

    list.forEach((name, index) => {
      const item = document.createElement("div");
      item.className = "category-item";
      item.innerHTML = `
        <span class="category-name">${name}</span>
        <div class="category-actions">
          <button type="button" class="btn-edit-category" data-index="${index}">Rename</button>
          <button type="button" class="btn-delete-category" data-index="${index}">Delete</button>
        </div>
      `;
      categoryListContainer.appendChild(item);
    });

    attachCategoryItemListeners();
  }

  function attachCategoryItemListeners() {
    if (!categoryListContainer) return;

    categoryListContainer.querySelectorAll(".btn-edit-category").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.getAttribute("data-index"), 10);
        const config = getEffectiveCategoryConfig();
        const list = activeCategoryType === "receive" ? [...config.receive] : [...config.pay];
        const currentName = list[index];
        if (currentName === undefined) return;

        const newName = prompt("Rename category:", currentName);
        if (newName === null) return;
        const trimmed = newName.trim();
        if (!trimmed) return;

        list[index] = trimmed;
        const updatedConfig =
          activeCategoryType === "receive"
            ? { ...config, receive: list }
            : { ...config, pay: list };

        saveCategoryConfig(updatedConfig);
        if (typeof dispatchCategoriesUpdated === "function") {
          dispatchCategoriesUpdated();
        } else {
          window.dispatchEvent(new CustomEvent("categoriesUpdated"));
        }
        renderCategoryList();
        updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");
      });
    });

    categoryListContainer.querySelectorAll(".btn-delete-category").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.getAttribute("data-index"), 10);
        const config = getEffectiveCategoryConfig();
        const list = activeCategoryType === "receive" ? [...config.receive] : [...config.pay];
        const name = list[index];
        if (name === undefined) return;

        if (!confirm(`Delete category "${name}"? Existing transactions will keep their old label.`)) {
          return;
        }

        list.splice(index, 1);
        const updatedConfig =
          activeCategoryType === "receive"
            ? { ...config, receive: list }
            : { ...config, pay: list };

        saveCategoryConfig(updatedConfig);
        if (typeof dispatchCategoriesUpdated === "function") {
          dispatchCategoriesUpdated();
        } else {
          window.dispatchEvent(new CustomEvent("categoriesUpdated"));
        }
        renderCategoryList();
        updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");
      });
    });
  }

  if (openCategoryManagerBtn) {
    openCategoryManagerBtn.addEventListener("click", openCategoryManager);
  }

  if (closeCategoryManagerBtn) {
    closeCategoryManagerBtn.addEventListener("click", closeCategoryManager);
  }

  if (categoryManagerModal) {
    categoryManagerModal.addEventListener("click", (e) => {
      if (e.target === categoryManagerModal) {
        closeCategoryManager();
      }
    });
  }

  if (categoryTabs && categoryTabs.length) {
    categoryTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const type = tab.getAttribute("data-category-tab");
        setActiveCategoryTab(type);
      });
    });
  }

  if (addCategoryBtn && newCategoryInput) {
    addCategoryBtn.addEventListener("click", () => {
      const rawName = newCategoryInput.value;
      const trimmed = rawName.trim();
      if (!trimmed) return;

      const config = getEffectiveCategoryConfig();
      const list = activeCategoryType === "receive" ? [...config.receive] : [...config.pay];

      if (list.includes(trimmed)) {
        alert("Category already exists.");
        return;
      }

      list.push(trimmed);
      const updatedConfig =
        activeCategoryType === "receive"
          ? { ...config, receive: list }
          : { ...config, pay: list };

      saveCategoryConfig(updatedConfig);
      newCategoryInput.value = "";

      if (typeof dispatchCategoriesUpdated === "function") {
        dispatchCategoriesUpdated();
      } else {
        window.dispatchEvent(new CustomEvent("categoriesUpdated"));
      }

      renderCategoryList();
      updateCategoryDropdown(typeSelect ? typeSelect.value : "pay");
    });

    newCategoryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCategoryBtn.click();
      }
    });
  }

  // Set initial active tab
  setActiveCategoryTab("pay");
});

function createToast() {
  const el = document.createElement("div");
  el.className = "toast";
  document.body.appendChild(el);
  return el;
}

function showToast(el, message) {
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
  }, 2000);
}
