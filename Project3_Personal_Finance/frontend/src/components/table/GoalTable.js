import React from "react";

export default function GoalTable({ goals }) {
  const getColorClass = (percent) => {
    if (percent < 40) return "bg-danger-grad";
    if (percent < 70) return "bg-warning-grad";
    return "bg-success-grad";
  };

  return (
    <div className="fin-card">
      <h5 className="card-head-title">Goals Progress</h5>
      <div className="table-responsive">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Target</th>
              <th>Current</th>
              <th style={{ width: "35%" }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const rawPercent = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
              const percent = Math.min(rawPercent, 100);
              
              return (
                <tr key={g.id || g.goalName}>
                  <td><strong>{g.goalName}</strong></td>
                  <td>{g.targetAmount?.toLocaleString()}</td>
                  <td>{g.currentAmount?.toLocaleString()}</td>
                  <td style={{ verticalAlign: "middle" }}>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${getColorClass(percent)}`}
                        style={{ width: `${percent}%` }}
                      >
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}