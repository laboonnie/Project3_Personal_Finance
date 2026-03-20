import api from './api';

// ========== BUDGETS API ==========
export const budgetApi = {
    // Lấy tất cả budgets
    getAll: () => api.get('/budgets'),

    // Lấy budgets của user
    getUserBudgets: (userId) => api.get(`/budgets/user/${userId}`),

    // Lấy budgets theo tháng (có tính chi tiêu thực tế)
    getMonthlyBudgets: (userId, month, year) =>
        api.get(`/budgets/user/${userId}/monthly?month=${month}&year=${year}`),

    // Tạo budget mới
    create: (data) => api.post('/budgets', data),

    // Sửa budget
    update: (id, data) => api.put(`/budgets/${id}`, data),

    // Xóa budget
    delete: (id) => api.delete(`/budgets/${id}`),

    // Lấy cảnh báo budget
    getAlerts: (userId, month, year) =>
        api.get(`/budgets/alerts/${userId}?month=${month}&year=${year}`),

    // Gợi ý budget theo 6 lọ
    getSuggestions: (userId, monthlyIncome) =>
        api.get(`/budgets/suggest/${userId}?monthlyIncome=${monthlyIncome}`),
    getAvailableYears: (userId) =>
        api.get(`/budgets/user/${userId}/available-years`)
};