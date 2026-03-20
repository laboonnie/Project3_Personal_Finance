import api from './api';

// ========== TRANSACTIONS API ==========
export const transactionApi = {
    // Lấy tất cả transactions
    getAll: () => api.get('/transactions'),

    // Lấy transactions của user
    getUserTransactions: (userId) => api.get(`/transactions/user/${userId}`),

    // Lấy transactions theo tháng
    getMonthlyTransactions: (userId, month, year) =>
        api.get(`/transactions/user/${userId}/monthly?month=${month}&year=${year}`),

    // Lấy chi tiết 1 transaction
    getById: (id) => api.get(`/transactions/${id}`),

    // Tạo transaction mới
    create: (data) => api.post('/transactions', data),

    // Sửa transaction
    update: (id, data) => api.put(`/transactions/${id}`, data),

    // Xóa transaction
    delete: (id) => api.delete(`/transactions/${id}`),

    // Tổng kết thu chi theo tháng
    getSummary: (userId, month, year) =>
        api.get(`/transactions/user/${userId}/summary?month=${month}&year=${year}`),

    // Xu hướng chi tiêu
    getTrends: (userId, months = 6) =>
        api.get(`/transactions/user/${userId}/trends?months=${months}`),

    // So sánh budget vs actual
    getBudgetVsActual: (userId, month, year) =>
        api.get(`/transactions/user/${userId}/budget-vs-actual?month=${month}&year=${year}`), 

    // API mới: lấy tổng thu nhập
    getTotalIncome: (userId, month, year) =>
        api.get(`/transactions/user/${userId}/total-income?month=${month}&year=${year}`), 

    // API lấy tổng chi tiêu (nếu cần)
    getTotalExpense: (userId, month, year) =>
        api.get(`/transactions/user/${userId}/total-expense?month=${month}&year=${year}`),

    getAvailableYears: (userId) =>
        api.get(`/transactions/user/${userId}/available-years`)
};