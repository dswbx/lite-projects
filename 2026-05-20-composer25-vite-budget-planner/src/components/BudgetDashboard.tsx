import { formatMoney } from "../lib/money";

export type CategorySummary = {
  categoryId: string;
  categoryName: string;
  budget: number;
  spent: number;
};

type Props = {
  monthLabel: string;
  summaries: CategorySummary[];
  totalBudget: number;
  totalSpent: number;
};

export function BudgetDashboard({
  monthLabel,
  summaries,
  totalBudget,
  totalSpent,
}: Props) {
  const remaining = totalBudget - totalSpent;

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2>{monthLabel}</h2>
          <p className="muted">Budget vs spending this month</p>
        </div>
        <div className="totals">
          <div>
            <span className="label">Budgeted</span>
            <strong>{formatMoney(totalBudget)}</strong>
          </div>
          <div>
            <span className="label">Spent</span>
            <strong>{formatMoney(totalSpent)}</strong>
          </div>
          <div>
            <span className="label">Remaining</span>
            <strong className={remaining < 0 ? "over" : ""}>
              {formatMoney(remaining)}
            </strong>
          </div>
        </div>
      </div>

      {summaries.length === 0 ? (
        <p className="muted empty">
          Add categories and monthly budgets to see your overview.
        </p>
      ) : (
        <ul className="budget-list">
          {summaries.map((row) => {
            const pct =
              row.budget > 0
                ? Math.min(100, (row.spent / row.budget) * 100)
                : row.spent > 0
                  ? 100
                  : 0;
            const over = row.budget > 0 && row.spent > row.budget;

            return (
              <li key={row.categoryId} className="budget-row">
                <div className="budget-row-top">
                  <span>{row.categoryName}</span>
                  <span className={over ? "over" : ""}>
                    {formatMoney(row.spent)} / {formatMoney(row.budget)}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${over ? "over" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
