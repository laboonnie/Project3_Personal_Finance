import api from "./api";
const dashboardApi ={
    getSummary : ()=> api.get("dashboard/summary"),
    getJarSpending:()=>api.get("dashboard/jar-spending"),
    getMonthlyExpense:()=>api.get("dashboard/monthly-expense"),
    getBudgets:()=>api.get("dashboard/budgets"),
    getGoals :()=>api.get("dashboard/goals")
}
export default dashboardApi;
