import api from './api';

export const budgetApi = {
    // Lấy tất cả budgets
    getAll: () => api.get('/budgets'),

    // Lấy budgets theo tháng (KHÔNG userId)
    getMonthlyBudgets: (month, year) =>
        api.get(`/budgets/monthly?month=${month}&year=${year}`),

    // Tạo budget mới (KHÔNG userId)
    create: (data) => api.post('/budgets', data),

    // Sửa budget
    update: (id, data) => api.put(`/budgets/${id}`, data),

    // Xóa budget
    delete: (id) => api.delete(`/budgets/${id}`),

    // Lấy cảnh báo budget (KHÔNG userId)
    getAlerts: (month, year) =>
        api.get(`/budgets/alerts?month=${month}&year=${year}`),

    // Gợi ý budget theo 6 lọ (KHÔNG userId)
    getSuggestions: (monthlyIncome) =>
        api.get(`/budgets/suggest?monthlyIncome=${monthlyIncome}`),

    // Lấy danh sách năm (KHÔNG userId)
    getAvailableYears: () =>
        api.get(`/budgets/available-years`)
};