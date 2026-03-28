export default function GoalTable({ goals }) {
  const getColor = (percent) => {
    if (percent < 40) return "bg-danger";
    if (percent < 70) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-4">Goals Progress</h5>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Goal</th>
                <th>Target</th>
                <th>Current</th>
                <th style={{ width: "30%" }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => {
                const rawPercent = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                const percent = Math.min(rawPercent, 100); 
                return (
                  <tr key={g.id}>
                    <td><strong>{g.goalName}</strong></td>
                    <td>{g.targetAmount.toLocaleString()}</td>
                    <td>{g.currentAmount.toLocaleString()}</td>
                   <td style={{ minWidth: "200px", verticalAlign: "middle" }}>
                        <div 
                            style={{ 
                            height: "24px", 
                            width: "100%", 
                            backgroundColor: "#e9ecef", 
                            borderRadius: "12px", 
                            overflow: "hidden",
                            position: "relative"
                            }}
                        >
                            <div
                            className={getColor(percent)} 
                            style={{
                                width: `${percent}%`,
                                height: "100%",
                                transition: "width 0.5s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "12px"
                            }}
                            >
                            <span style={{ 
                                color: "white", 
                                fontSize: "12px", 
                                fontWeight: "bold",
                                whiteSpace: "nowrap" 
                            }}>
                                {percent.toFixed(0)}%
                            </span>
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
    </div>
  );
}