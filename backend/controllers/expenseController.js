
const db = require("../config/db");

// GET ALL EXPENSES
exports.getExpenses = async (req, res) => {
  try {
    const [expenses] = await db.execute(
      `SELECT
        id,
        user_id AS userId,
        title,
        amount,
        category,
        expense_date AS date,
        note,
        created_at AS createdAt
       FROM expenses
       WHERE user_id = ?
       ORDER BY expense_date DESC, id DESC`,
      [req.userId]
    );

    res.json(expenses);
  } catch (error) {
    console.error("Fetch expenses error:", error.message);

    res.status(500).json({
      message: "Failed to fetch expenses",
    });
  }
};

// CREATE EXPENSE
exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;

    if (
      !title?.trim() ||
      !category?.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Valid title, amount and category are required",
      });
    }

    const expenseDate = date
      ? String(date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const [result] = await db.execute(
      `INSERT INTO expenses
        (user_id, title, amount, category, expense_date, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        title.trim(),
        Number(amount),
        category.trim(),
        expenseDate,
        note || "",
      ]
    );

    const [rows] = await db.execute(
      `SELECT
        id,
        user_id AS userId,
        title,
        amount,
        category,
        expense_date AS date,
        note,
        created_at AS createdAt
       FROM expenses
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.userId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Create expense error:", error.message);

    res.status(500).json({
      message: "Failed to create expense",
    });
  }
};

// UPDATE EXPENSE
exports.updateExpense = async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;
    const expenseId = Number(req.params.id);

    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const [existingRows] = await db.execute(
      "SELECT id FROM expenses WHERE id = ? AND user_id = ?",
      [expenseId, req.userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Title cannot be empty",
        });
      }

      updates.push("title = ?");
      values.push(title.trim());
    }

    if (amount !== undefined) {
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than zero",
        });
      }

      updates.push("amount = ?");
      values.push(Number(amount));
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          message: "Category cannot be empty",
        });
      }

      updates.push("category = ?");
      values.push(category.trim());
    }

    if (date !== undefined) {
      updates.push("expense_date = ?");
      values.push(String(date).slice(0, 10));
    }

    if (note !== undefined) {
      updates.push("note = ?");
      values.push(note || "");
    }

    if (updates.length > 0) {
      values.push(expenseId, req.userId);

      await db.execute(
        `UPDATE expenses
         SET ${updates.join(", ")}
         WHERE id = ? AND user_id = ?`,
        values
      );
    }

    const [rows] = await db.execute(
      `SELECT
        id,
        user_id AS userId,
        title,
        amount,
        category,
        expense_date AS date,
        note,
        created_at AS createdAt
       FROM expenses
       WHERE id = ? AND user_id = ?`,
      [expenseId, req.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Update expense error:", error.message);

    res.status(500).json({
      message: "Failed to update expense",
    });
  }
};

// DELETE EXPENSE
exports.deleteExpense = async (req, res) => {
  try {
    const expenseId = Number(req.params.id);

    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({
        message: "Invalid expense ID",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [expenseId, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error.message);

    res.status(500).json({
      message: "Failed to delete expense",
    });
  }
};
