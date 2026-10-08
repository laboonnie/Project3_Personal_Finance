import React from "react";

export default function BudgetTable({ budgets }) {
  return (
    <div className="fin-card">
      <h5 className="card-head-title">Budget Progress</h5>
      <div className="table-responsive">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Jar</th>
              <th>Budget</th>
              <th>Spent</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b, index) => (
              <tr key={index}>
                <td><strong>{b.jar}</strong></td>
                <td>{b.budget?.toLocaleString()}</td>
                <td>{b.spent?.toLocaleString()}</td>
                <td style={{ color: b.remaining < 0 ? "#ff497c" : "inherit" }}>
                  {b.remaining?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}