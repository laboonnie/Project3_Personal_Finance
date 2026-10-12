import api from './api';

export const remainingActionApi = {
    // Lấy tổng tiền dư của tháng
    getSummary: (month, year) =>
        api.get(
            `/RemainingActions/summary?month=${month}&year=${year}`
        ),

    // Lấy lịch sử xử lý tiền dư
    getActions: (month, year) =>
        api.get(
            `/RemainingActions?month=${month}&year=${year}`
        ),

    // Phân bổ tiền dư vào GOAL, DEBT, INVESTMENT
    create: (data) =>
        api.post('/RemainingActions', data),

    // Chuyển tiền dư sang tháng tiếp theo
    createCarryOver: (data) =>
        api.post('/RemainingActions/carry-over', data)
};
