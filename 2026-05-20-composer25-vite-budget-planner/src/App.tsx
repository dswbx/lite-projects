import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import {
  BudgetDashboard,
  type CategorySummary,
} from "./components/BudgetDashboard";
import {
  Category,
  Expense,
  MonthlyBudget,
  supabase,
} from "./lib/supabase";
import { currentPeriod, monthDateRange, monthLabel } from "./lib/dates";
import { formatMoney, parseAmount } from "./lib/money";

export default function App() {
  const period = currentPeriod();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const loadData = useCallback(async () => {
    const { start, end } = monthDateRange(period.year, period.month);

    const [categoriesRes, budgetsRes, expensesRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("monthly_budgets")
        .select("*")
        .eq("budget_year", period.year)
        .eq("budget_month", period.month),
      supabase
        .from("expenses")
        .select("*, categories(name)")
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", { ascending: false }),
    ]);

    if (categoriesRes.error || budgetsRes.error || expensesRes.error) {
      setError(
        categoriesRes.error?.message ??
          budgetsRes.error?.message ??
          expensesRes.error?.message ??
          "Failed to load data",
      );
      return;
    }

    setError(null);
    setCategories(categoriesRes.data ?? []);
    setBudgets(budgetsRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
  }, [period.month, period.year]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session, loadData]);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!budgetCategoryId) setBudgetCategoryId(categories[0].id);
    if (!expenseCategoryId) setExpenseCategoryId(categories[0].id);
  }, [categories, budgetCategoryId, expenseCategoryId]);

  const summaries = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    for (const expense of expenses) {
      const amount = Number(expense.amount);
      spentByCategory.set(
        expense.category_id,
        (spentByCategory.get(expense.category_id) ?? 0) + amount,
      );
    }

    const budgetByCategory = new Map(
      budgets.map((b) => [b.category_id, Number(b.amount)]),
    );

    const rows: CategorySummary[] = categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      budget: budgetByCategory.get(category.id) ?? 0,
      spent: spentByCategory.get(category.id) ?? 0,
    }));

    return rows.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [categories, budgets, expenses]);

  const totalBudget = summaries.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = summaries.reduce((sum, row) => sum + row.spent, 0);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCategories([]);
    setBudgets([]);
    setExpenses([]);
  }

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault();
    if (!session || !newCategory.trim()) return;

    const { error: insertError } = await supabase.from("categories").insert({
      name: newCategory.trim(),
      user_id: session.user.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewCategory("");
    await loadData();
  }

  async function handleSetBudget(event: FormEvent) {
    event.preventDefault();
    if (!session || !budgetCategoryId) return;

    const amount = parseAmount(budgetAmount);
    if (amount === null || amount < 0) {
      setError("Enter a valid budget amount");
      return;
    }

    const existing = budgets.find((b) => b.category_id === budgetCategoryId);

    const payload = {
      user_id: session.user.id,
      category_id: budgetCategoryId,
      budget_year: period.year,
      budget_month: period.month,
      amount,
    };

    const { error: upsertError } = existing
      ? await supabase
          .from("monthly_budgets")
          .update({ amount })
          .eq("id", existing.id)
      : await supabase.from("monthly_budgets").insert(payload);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setBudgetAmount("");
    await loadData();
  }

  async function handleLogExpense(event: FormEvent) {
    event.preventDefault();
    if (!session || !expenseCategoryId) return;

    const amount = parseAmount(expenseAmount);
    if (amount === null || amount <= 0) {
      setError("Enter a valid expense amount");
      return;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      user_id: session.user.id,
      category_id: expenseCategoryId,
      amount,
      note: expenseNote.trim() || null,
      expense_date: expenseDate,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setExpenseAmount("");
    setExpenseNote("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    await loadData();
  }

  async function handleDeleteExpense(id: string) {
    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return <div className="page loading">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="page">
        <AuthPanel
          onAuth={async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="top-bar">
        <div>
          <h1>Monthly Budget Planner</h1>
          <p className="muted">{session.user.email}</p>
        </div>
        <button type="button" className="secondary" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      {error && <p className="banner error">{error}</p>}

      <BudgetDashboard
        monthLabel={monthLabel(period.year, period.month)}
        summaries={summaries}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
      />

      <div className="grid">
        <section className="card">
          <h2>Categories</h2>
          <form onSubmit={handleAddCategory} className="inline-form">
            <input
              type="text"
              placeholder="e.g. Groceries"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>
          <ul className="simple-list">
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Set monthly budget</h2>
          <form onSubmit={handleSetBudget} className="stack">
            <label>
              Category
              <select
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                disabled={categories.length === 0}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount for {monthLabel(period.year, period.month)}
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                required
                disabled={categories.length === 0}
              />
            </label>
            <button type="submit" disabled={categories.length === 0}>
              Save budget
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Log expense</h2>
          <form onSubmit={handleLogExpense} className="stack">
            <label>
              Category
              <select
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                disabled={categories.length === 0}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
                disabled={categories.length === 0}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                disabled={categories.length === 0}
              />
            </label>
            <label>
              Note (optional)
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                disabled={categories.length === 0}
              />
            </label>
            <button type="submit" disabled={categories.length === 0}>
              Add expense
            </button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Recent expenses this month</h2>
        {expenses.length === 0 ? (
          <p className="muted empty">No expenses logged yet this month.</p>
        ) : (
          <ul className="expense-list">
            {expenses.map((expense) => (
              <li key={expense.id}>
                <div>
                  <strong>
                    {expense.categories?.name ?? "Unknown category"}
                  </strong>
                  <span className="muted">
                    {expense.expense_date}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </span>
                </div>
                <div className="expense-actions">
                  <span>{formatMoney(Number(expense.amount))}</span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
