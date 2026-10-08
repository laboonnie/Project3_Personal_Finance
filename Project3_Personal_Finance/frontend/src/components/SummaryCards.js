import React from "react";

// Các Icon SVG tối giản chuẩn phong cách Dashboard
const IncomeIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const ExpenseIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const BalanceIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </svg>
);

const DebtIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function SummaryCards({ data }) {
  return (
    <div className="row g-3 mb-4">
      <div className="col-md-3 col-sm-6">
        <div className="summary-card bg-income">
          <div className="summary-card-icon">
            <IncomeIcon />
          </div>
          <div className="card-title-sub">Total Income</div>
          <h3 className="card-value">{data.totalIncome?.toLocaleString()}</h3>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="summary-card bg-expense">
          <div className="summary-card-icon">
            <ExpenseIcon />
          </div>
          <div className="card-title-sub">Total Expense</div>
          <h3 className="card-value">{data.totalExpense?.toLocaleString()}</h3>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="summary-card bg-balance">
          <div className="summary-card-icon">
            <BalanceIcon />
          </div>
          <div className="card-title-sub">Net Balance</div>
          <h3 className="card-value">{data.netBalance?.toLocaleString()}</h3>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="summary-card bg-debt">
          <div className="summary-card-icon">
            <DebtIcon />
          </div>
          <div className="card-title-sub">Total Debt</div>
          <h3 className="card-value">{data.totalDebt?.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );
}