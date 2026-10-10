import api from "./api";

const dashboardApi = {
    getSummary: (month, year) => 
        api.get("dashboard/summary", { params: { month, year } }),
        
    getJarSpending: (month, year) => 
        api.get("dashboard/jar-spending", { params: { month, year } }),
        
    getMonthlyExpense: (year) => 
        api.get("dashboard/monthly-expense", { params: { year } }),
        
    getBudgets: (month, year) => 
        api.get("dashboard/budgets", { params: { month, year } }),
        
    getGoals: () => 
        api.get("dashboard/goals")
};
export const getSummary = (month, year) => 
    api.get("dashboard/summary", { params: { month, year } });
export const getJarSpending = (month, year) => 
    api.get("dashboard/jar-spending", { params: { month, year } });
export const getMonthlyExpense = (year) => 
    api.get("dashboard/monthly-expense", { params: { year } });
export const getBudgets = (month, year) => 
    api.get("dashboard/budgets", { params: { month, year } });
export const getGoals = () => 
    api.get("dashboard/goals");
export default dashboardApi;