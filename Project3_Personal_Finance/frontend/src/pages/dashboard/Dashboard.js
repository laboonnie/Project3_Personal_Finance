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

  useEffect(() => {
    getSummary().then(res => setSummary(res.data));
    getJarSpending().then(res => setJars(res.data));
    getBudgets().then(res => setBudgets(res.data));
    getGoals().then(res => setGoals(res.data));
  }, []);
    return(
        /* Bọc thẻ ngoài cùng bằng className "fin-dashboard-wrapper" */
        <div className="fin-dashboard-wrapper">
            <h2 className="dashboard-title">Personal Finance Dashboard</h2>
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