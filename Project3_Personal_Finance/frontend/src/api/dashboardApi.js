import api from "./api";
const dashboardApi ={
    getSummary : ()=> api.get("dashboard/summary"),
    getJarSpending:()=>api.get("dashboard/jar-spending"),
    getMonthlyExpense:()=>api.get("dashboard/monthly-expense"),
    getBudgets:()=>api.get("dashboard/budgets"),
    getGoals :()=>api.get("dashboard/goals")
}
export const getSummary = () => api.get("dashboard/summary");
export const getJarSpending = () => api.get("dashboard/jar-spending");
export const getMonthlyExpense = () => api.get("dashboard/monthly-expense");
export const getBudgets = () => api.get("dashboard/budgets");
export const getGoals = () => api.get("dashboard/goals");
