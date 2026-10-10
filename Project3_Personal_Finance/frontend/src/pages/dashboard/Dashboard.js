import React, { useEffect, useState } from "react";
import SummaryCards from "../../components/SummaryCards";
import JarChart from "../../components/JarChart";
import BudgetTable from "../../components/table/BudgetTable";
import GoalTable from "../../components/table/GoalTable";
import { getSummary, getBudgets, getGoals, getJarSpending } from "../../api/dashboardApi";
import "./dashboard.css"; // Import CSS mới

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [jars, setJars] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    getSummary(selectedMonth, selectedYear).then(res => setSummary(res.data));
    getJarSpending(selectedMonth, selectedYear).then(res => setJars(res.data));
    getBudgets(selectedMonth, selectedYear).then(res => setBudgets(res.data));
    getGoals().then(res => setGoals(res.data));
  }, [selectedMonth, selectedYear]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    return(
        /* Bọc thẻ ngoài cùng bằng className "fin-dashboard-wrapper" */
        <div className="fin-dashboard-wrapper">
           <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2 className="dashboard-title m-0">Personal Finance Dashboard</h2>

        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold text-muted small me-1">Thời gian:</label>

          <select 
            className="form-select form-select-sm shadow-sm border-0" 
            style={{ width: "120px", borderRadius: "10px", fontWeight: "600" }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          <select 
            className="form-select form-select-sm shadow-sm border-0" 
            style={{ width: "100px", borderRadius: "10px", fontWeight: "600" }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
            <SummaryCards data={summary}/>
            
            <div className="row g-4">
                <div className="col-md-6">
                    <JarChart data={jars}/>
                </div>
                <div className="col-md-6">
                    <BudgetTable budgets={budgets}/>
                </div>
            </div>
            
            <div className="mt-4">
                <GoalTable goals={goals}/>
            </div>
        </div>
    )
}