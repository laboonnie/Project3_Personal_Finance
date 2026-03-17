const BASE_URL = "http://localhost:5084/api";

export const debtApi = {
    getAll: async () => {
        const res = await fetch(`${BASE_URL}/Debts`);
        return res.json();
    },

    create: async (data) => {
        const res = await fetch(`${BASE_URL}/Debts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: 0,
                userId: data.userId,
                debtName: data.debtName,
                totalAmount: parseFloat(data.totalAmount),
                remainingAmount: parseFloat(data.totalAmount),
                interestRate: parseFloat(data.interestRate) || 0,
                dueDate: data.dueDate,
                status: "active",
                user: null,
                payments: []
            })
        });
        return res.json();
    },

    update: async (id, data) => {
        const res = await fetch(`${BASE_URL}/Debts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (res.ok) return true;
        return false;
    },

    delete: async (id) => {
        await fetch(`${BASE_URL}/Debts/${id}`, { method: "DELETE" });
    },

    getPayments: async (debtId) => {
        const res = await fetch(`${BASE_URL}/DebtPayments`);
        const all = await res.json();
        return all.filter(p => p.debtId === debtId);
    },

    addPayment: async (data) => {
        const res = await fetch(`${BASE_URL}/DebtPayments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};