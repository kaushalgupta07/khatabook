/**
 * Transaction CRUD routes.
 * All transactions are scoped to the authenticated user.
 */
const express = require("express");
const pool = require("../config/database");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /transactions
 * Returns all transactions for the logged-in user.
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, date, category, description, amount, debit_account AS debitAccount, 
       credit_account AS creditAccount, type, created_at AS createdAt 
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY date DESC, created_at DESC`,
      [req.user.userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * POST /transactions
 * Add a new transaction for the user.
 * Body: { date, category, description, amount, debitAccount, creditAccount, type }
 */
router.post("/", async (req, res) => {
  const {
    date,
    category,
    description,
    amount,
    debitAccount,
    creditAccount,
    type,
  } = req.body;

  if (!date || amount == null || !type) {
    return res.status(400).json({
      error: "date, amount, and type are required",
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO transactions (user_id, date, category, description, amount, debit_account, credit_account, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        date,
        category || "Other",
        description || "",
        Number(amount),
        debitAccount || "",
        creditAccount || "",
        type,
      ]
    );

    const [newRow] = await pool.execute(
      `SELECT id, date, category, description, amount, debit_account AS debitAccount, 
       credit_account AS creditAccount, type, created_at AS createdAt 
       FROM transactions WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error("Add transaction error:", err);
    res.status(500).json({ error: "Failed to save transaction" });
  }
});

/**
 * POST /transactions/bulk
 * Bulk insert transactions (for localStorage migration).
 * Body: { transactions: [...] }
 */
router.post("/bulk", async (req, res) => {
  const { transactions: txns } = req.body;

  if (!Array.isArray(txns) || txns.length === 0) {
    return res.status(400).json({ error: "transactions array is required" });
  }

  try {
    const userId = req.user.userId;
    const values = txns.map((t) => [
      userId,
      t.date || new Date().toISOString().slice(0, 10),
      t.category || "Other",
      t.description || "",
      Number(t.amount) || 0,
      t.debitAccount || "",
      t.creditAccount || "",
      t.type || "pay",
    ]);

    const placeholders = values
      .map(() => "(?, ?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    const flatValues = values.flat();

    await pool.execute(
      `INSERT INTO transactions (user_id, date, category, description, amount, debit_account, credit_account, type)
       VALUES ${placeholders}`,
      flatValues
    );

    res.status(201).json({
      message: `${txns.length} transaction(s) imported`,
      count: txns.length,
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({ error: "Failed to import transactions" });
  }
});

/**
 * PUT /transactions/:id
 * Update a transaction (must belong to user).
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    date,
    category,
    description,
    amount,
    debitAccount,
    creditAccount,
    type,
  } = req.body;

  try {
    const [result] = await pool.execute(
      `UPDATE transactions SET 
        date = COALESCE(?, date),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        debit_account = COALESCE(?, debit_account),
        credit_account = COALESCE(?, credit_account),
        type = COALESCE(?, type)
       WHERE id = ? AND user_id = ?`,
      [
        date,
        category,
        description,
        amount != null ? Number(amount) : null,
        debitAccount,
        creditAccount,
        type,
        id,
        req.user.userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const [rows] = await pool.execute(
      `SELECT id, date, category, description, amount, debit_account AS debitAccount, 
       credit_account AS creditAccount, type, created_at AS createdAt 
       FROM transactions WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Update transaction error:", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

/**
 * DELETE /transactions/:id
 * Delete a transaction (must belong to user).
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?",
      [id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

module.exports = router;
