import React, { useEffect, useState } from "react";
import SummaryCards from "../../components/SummaryCards";
import JarChart from "../../components/JarChart";
import BudgetTable from "../../components/table/BudgetTable";
import GoalTable from "../../components/table/GoalTable";

import{getSummary,getBudgets,getGoals,getJarSpending} from "../../api/dashboardApi";

export default function Dashboard(){
    const [summary ,setSummary]=useState({});
    const [jars,setJars]=useState([]);
    const [budgets,setBudgets]=useState([]);
    const [goals,setGoals]=useState([]);

    useEffect(() => {
        getSummary().then(res => setSummary(res.data)).catch(err => console.error("Summary error:", err));
        getJarSpending().then(res => setJars(res.data)).catch(err => console.error("Jar spending error:", err));
        getBudgets().then(res => setBudgets(res.data)).catch(err => console.error("Budgets error:", err));
        getGoals().then(res => setGoals(res.data)).catch(err => console.error("Goals error:", err));
    }, []);
    return(
        <div className="container mb-4">
            <h2>Personal Finance Dashboard</h2>
            <SummaryCards data={summary}/>
            <div className="row">
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