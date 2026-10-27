import { useState, useEffect } from "react";
import "./App.css";
import Auth from "./Auth";
import { apiRequest } from "./api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const initialForm = () => ({
  title: "",
  amount: "",
  category: "Food",
  date: new Date().toISOString().split("T")[0],
  note: "",
});

const chartColors = [
  "#64748b",
  "#0f766e",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#2563eb",
  "#0891b2",
];

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");

  // Monthly budget
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const savedBudget = localStorage.getItem("monthlyBudget");
    const parsedBudget = Number(savedBudget);

    return savedBudget && Number.isFinite(parsedBudget) && parsedBudget > 0
      ? parsedBudget
      : 10000;
  });

  const [budgetInput, setBudgetInput] = useState(() => {
    const savedBudget = localStorage.getItem("monthlyBudget");
    const parsedBudget = Number(savedBudget);

    return savedBudget && Number.isFinite(parsedBudget) && parsedBudget > 0
      ? savedBudget
      : "10000";
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [formData, setFormData] = useState(initialForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Load expenses from the backend
  useEffect(() => {
    async function loadExpenses() {
      try {
        const data = await apiRequest("/api/expenses");
        setExpenses(Array.isArray(data) ? data : []);
      } catch (error) {
        setApiError(error.message);
      }
    }

    loadExpenses();
  }, []);

  // Total spending across all recorded expenses
  const total = expenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );

  // Count expenses in each category
  const categoryCounts = expenses.reduce((counts, expense) => {
    const category = expense.category || "Other";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "—";

  // Search, filter and sort expenses
  const filteredExpenses = expenses
    .filter((expense) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        (expense.title || "").toLowerCase().includes(search) ||
        (expense.note || "").toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All" || expense.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }

      if (sortBy === "oldest") {
        return new Date(a.date || 0) - new Date(b.date || 0);
      }

      if (sortBy === "amountLow") {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }

      if (sortBy === "amountHigh") {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }

      return 0;
    });

  // Monthly spending chart: current month and previous five months
  const monthlyChartData = (() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      months.push({
        monthKey,
        month: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        amount: 0,
      });
    }

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      if (Number.isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const month = months.find((item) => item.monthKey === monthKey);

      if (month) {
        month.amount += Number(expense.amount) || 0;
      }
    });

    return months;
  })();

  // Expenses recorded in the current month
  const now = new Date();

  const currentMonthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.date);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  const monthlyTotal = currentMonthExpenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );

  // Monthly budget calculations
  const budgetRemaining = monthlyBudget - monthlyTotal;

  const budgetUsedPercentage =
    monthlyBudget > 0 ? (monthlyTotal / monthlyBudget) * 100 : 0;

  function handleBudgetSave(event) {
    event.preventDefault();

    const newBudget = Number(budgetInput);

    if (
      budgetInput.trim() === "" ||
      !Number.isFinite(newBudget) ||
      newBudget <= 0
    ) {
      setApiError("Please enter a valid monthly budget greater than zero.");
      return;
    }

    setMonthlyBudget(newBudget);
    localStorage.setItem("monthlyBudget", String(newBudget));
    setBudgetInput(String(newBudget));
    setApiError("");
  }

  // Category breakdown for the current month
  const categoryChartData = Object.values(
    currentMonthExpenses.reduce((result, expense) => {
      const category = expense.category || "Other";

      if (!result[category]) {
        result[category] = { name: category, value: 0 };
      }

      result[category].value += Number(expense.amount) || 0;

      return result;
    }, {})
  ).filter((item) => item.value > 0);

  // Highest expense in the current month
  const highestMonthlyExpense = currentMonthExpenses.reduce(
    (highest, expense) =>
      (Number(expense.amount) || 0) > (Number(highest?.amount) || 0)
        ? expense
        : highest,
    null
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function handleEdit(expense) {
    setEditingId(expense.id);

    const expenseDate = expense.date ? new Date(expense.date) : new Date();

    setFormData({
      title: expense.title || "",
      amount: String(expense.amount ?? ""),
      category: expense.category || "Food",
      date: Number.isNaN(expenseDate.getTime())
        ? initialForm().date
        : [
            expenseDate.getFullYear(),
            String(expenseDate.getMonth() + 1).padStart(2, "0"),
            String(expenseDate.getDate()).padStart(2, "0"),
          ].join("-"),
      note: expense.note || "",
    });

    setApiError("");
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    setApiError("");

    try {
      await apiRequest(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== id)
      );

      if (editingId === id) {
        cancelForm();
      }
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError("");

    if (
      !formData.title.trim() ||
      !Number.isFinite(Number(formData.amount)) ||
      Number(formData.amount) <= 0
    ) {
      setApiError("Please enter a title and a valid amount.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingId);

      const savedExpense = await apiRequest(
        isEditing ? `/api/expenses/${editingId}` : "/api/expenses",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify({
            ...formData,
            title: formData.title.trim(),
            amount: Number(formData.amount),
          }),
        }
      );

      if (isEditing) {
        setExpenses((previous) =>
          previous.map((expense) =>
            expense.id === editingId ? savedExpense : expense
          )
        );
      } else {
        setExpenses((previous) => [savedExpense, ...previous]);
      }

      setFormData(initialForm());
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialForm());
    setApiError("");
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-IN");
  }

  function formatCurrency(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Sidebar navigation
  function navigateToSection(event, sectionId) {
    event.preventDefault();
    setActiveSection(sectionId);

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.reload();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>ExpenseFlow</h2>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={`nav-link ${
              activeSection === "dashboard" ? "active" : ""
            }`}
            onClick={(event) => navigateToSection(event, "dashboard")}
          >
            Dashboard
          </a>

          <a
            href="#expenses"
            className={`nav-link ${
              activeSection === "expenses" ? "active" : ""
            }`}
            onClick={(event) => navigateToSection(event, "expenses")}
          >
            My Expenses
          </a>

          <a
            href="#reports"
            className={`nav-link ${
              activeSection === "reports" ? "active" : ""
            }`}
            onClick={(event) => navigateToSection(event, "reports")}
          >
            Reports
          </a>

          <a
            href="#settings"
            className={`nav-link ${
              activeSection === "settings" ? "active" : ""
            }`}
            onClick={(event) => navigateToSection(event, "settings")}
          >
            Settings
          </a>
        </nav>

        <button className="cancel-button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's your financial overview.</p>
          </div>

          <button
            className="add-button"
            onClick={() => {
              if (showForm && !editingId) {
                cancelForm();
              } else {
                setFormData(initialForm());
                setEditingId(null);
                setApiError("");
                setShowForm(true);
              }
            }}
          >
            + Add Expense
          </button>
        </header>

        {apiError && (
          <p className="auth-error" role="alert">
            {apiError}
          </p>
        )}

        {showForm && (
          <section className="expenses-section form-section">
            <h2>{editingId ? "Edit Expense" : "Add New Expense"}</h2>

            <form onSubmit={handleSubmit} className="expense-form">
              <label>
                Expense Title
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Groceries"
                  required
                />
              </label>

              <label>
                Amount (₹)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g. 850"
                  required
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Bills</option>
                  <option>Health</option>
                  <option>Education</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="full-width">
                Note (optional)
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Add a note"
                />
              </label>

              <div className="form-actions full-width">
                <button
                  type="submit"
                  className="add-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Expense"
                      : "Save Expense"}
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Overall Summary Cards */}
        <section className="summary-grid">
          <div className="summary-card">
            <p>Total Expenses</p>
            <h2>{formatCurrency(total)}</h2>
            <span>All expenses currently listed</span>
          </div>

          <div className="summary-card">
            <p>Transactions</p>
            <h2>{expenses.length}</h2>
            <span>Expenses saved</span>
          </div>

          <div className="summary-card">
            <p>Top Category</p>
            <h2>{topCategory}</h2>
            <span>Most frequent category</span>
          </div>
        </section>

        {/* Monthly Budget Management */}
        <section className="budget-section" id="settings">
          <div className="budget-header">
            <div>
              <h2>Monthly Budget</h2>
              <p>Track your spending against your monthly limit.</p>
            </div>

            <span className="budget-month">
              {new Date().toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <form className="budget-form" onSubmit={handleBudgetSave}>
            <label htmlFor="monthly-budget">
              Set your monthly budget (₹)
            </label>

            <div className="budget-input-row">
              <input
                id="monthly-budget"
                type="number"
                min="0.01"
                step="0.01"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                placeholder="Enter monthly budget"
                required
              />

              <button type="submit" className="add-button">
                Save Budget
              </button>
            </div>
          </form>

          <div className="budget-amounts">
            <div>
              <span>Monthly Budget</span>
              <h3>{formatCurrency(monthlyBudget)}</h3>
            </div>

            <div>
              <span>Spent This Month</span>
              <h3>{formatCurrency(monthlyTotal)}</h3>
            </div>

            <div>
              <span>
                {budgetRemaining >= 0 ? "Remaining Budget" : "Over Budget"}
              </span>

              <h3
                className={
                  budgetRemaining < 0 ? "budget-danger" : "budget-positive"
                }
              >
                {formatCurrency(Math.abs(budgetRemaining))}
              </h3>
            </div>
          </div>

          <div className="budget-progress-heading">
            <span>Budget Used</span>
            <strong>{budgetUsedPercentage.toFixed(1)}%</strong>
          </div>

          <div
            className="budget-progress-track"
            role="progressbar"
            aria-label="Monthly budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(
              100,
              Math.max(0, budgetUsedPercentage)
            )}
          >
            <div
              className={`budget-progress-fill ${
                budgetUsedPercentage >= 100
                  ? "budget-progress-danger"
                  : budgetUsedPercentage >= 80
                    ? "budget-progress-warning"
                    : ""
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, budgetUsedPercentage)
                )}%`,
              }}
            />
          </div>

          {budgetUsedPercentage >= 100 ? (
            <p className="budget-message budget-danger">
              You have reached or exceeded your monthly budget.
            </p>
          ) : budgetUsedPercentage >= 80 ? (
            <p className="budget-message budget-warning">
              You have used most of your budget. Keep an eye on your spending.
            </p>
          ) : (
            <p className="budget-message">
              You are within your monthly budget. Keep it up!
            </p>
          )}
        </section>

        {/* Monthly Expense Reports */}
        <section className="reports-section" id="reports">
          <h2>Expense Reports</h2>

          <div className="reports-grid">
            <div className="report-card">
              <h3>Monthly Spending</h3>
              <p className="report-subtitle">Last 6 months</p>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(value),
                        "Spending",
                      ]}
                    />
                    <Bar
                      dataKey="amount"
                      name="Spending"
                      fill="#64748b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="report-card">
              <h3>Category Breakdown</h3>
              <p className="report-subtitle">This month</p>

              {categoryChartData.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={80}
                        label
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value),
                          "Spending",
                        ]}
                      />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="empty-message">
                  No expenses recorded this month yet.
                </p>
              )}
            </div>
          </div>

          <div className="monthly-summary">
            <div className="monthly-summary-card">
              <span>This Month's Spending</span>
              <h3>{formatCurrency(monthlyTotal)}</h3>
            </div>

            <div className="monthly-summary-card">
              <span>Transactions This Month</span>
              <h3>{currentMonthExpenses.length}</h3>
            </div>

            <div className="monthly-summary-card">
              <span>Highest Expense This Month</span>
              <h3>
                {highestMonthlyExpense
                  ? formatCurrency(highestMonthlyExpense.amount)
                  : "₹0.00"}
              </h3>
              <p>
                {highestMonthlyExpense
                  ? highestMonthlyExpense.title
                  : "No expenses yet"}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Expenses */}
        <section className="expenses-section" id="expenses">
          <h2>Recent Expenses</h2>

          <div className="expense-filters">
            <input
              type="search"
              placeholder="Search title or note..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search expenses"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="All">All Categories</option>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Shopping">Shopping</option>
              <option value="Bills">Bills</option>
              <option value="Health">Health</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort expenses"
            >
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="amountLow">Amount: Low to High</option>
              <option value="amountHigh">Amount: High to Low</option>
            </select>
          </div>

          {expenses.length === 0 ? (
            <p className="empty-message">
              No expenses to display yet. Add your first expense!
            </p>
          ) : filteredExpenses.length === 0 ? (
            <p className="empty-message">
              No matching expenses found. Try another search or filter.
            </p>
          ) : (
            <div className="expense-list">
              {filteredExpenses.map((expense) => (
                <div className="expense-row" key={expense.id}>
                  <div className="expense-details">
                    <strong>{expense.title}</strong>
                    <p>
                      {expense.category} · {formatDate(expense.date)}
                    </p>
                    {expense.note && <small>{expense.note}</small>}
                  </div>

                  <div className="expense-actions">
                    <strong>{formatCurrency(expense.amount)}</strong>

                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => handleEdit(expense)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard />;
}

export default App;