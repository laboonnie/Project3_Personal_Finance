import api from './api';

export const transactionApi = {
    // Lấy tất cả transactions
    getAll: () => api.get('/transactions'),

    // Lấy transactions theo tháng (KHÔNG userId)
    getMonthlyTransactions: (month, year) =>
        api.get(`/transactions/monthly?month=${month}&year=${year}`),

    // Lấy chi tiết 1 transaction
    getById: (id) => api.get(`/transactions/${id}`),

    // Tạo transaction mới (KHÔNG userId)
    create: (data) => api.post('/transactions', data),

    // Sửa transaction
    update: (id, data) => api.put(`/transactions/${id}`, data),

    // Xóa transaction
    delete: (id) => api.delete(`/transactions/${id}`),

    // Tổng kết thu chi theo tháng (KHÔNG userId)
    getSummary: (month, year) =>
        api.get(`/transactions/summary?month=${month}&year=${year}`),

    // Xu hướng chi tiêu (KHÔNG userId)
    getTrends: (months = 6) =>
        api.get(`/transactions/trends?months=${months}`),

    // So sánh budget vs actual (KHÔNG userId)
    getBudgetVsActual: (month, year) =>
        api.get(`/transactions/budget-vs-actual?month=${month}&year=${year}`),

    // Lấy tổng thu nhập (KHÔNG userId)
    getTotalIncome: (month, year) =>
        api.get(`/transactions/total-income?month=${month}&year=${year}`),

    // Lấy danh sách năm (KHÔNG userId)
    getAvailableYears: () =>
        api.get(`/transactions/available-years`),

    // Lấy chi tiêu theo jar (KHÔNG userId)
    getByJar: (month, year) =>
        api.get(`/transactions/by-jar?month=${month}&year=${year}`)
};