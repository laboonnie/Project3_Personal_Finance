const BASE_URL = "http://localhost:5084/api";

const toDateOnly = (value) => {
    if (!value) return null;
    // Backend expects System.DateOnly: yyyy-MM-dd
    if (typeof value === "string" && value.includes("T")) {
        return value.split("T")[0];
    }
    return value;
};

export const debtApi = {
    getAll: async () => {
        const res = await fetch(`${BASE_URL}/Debts`);
        if (!res.ok) throw new Error("Lỗi load debts");
        return res.json();
    },

    create: async (data) => {
        const payload = {
            userId: data.userId,
            debtName: data.debtName,
            totalAmount: Number(data.totalAmount),
            interestRate: Number(data.interestRate) || 0,
            dueDate: toDateOnly(data.dueDate)
        };

        const res = await fetch(`${BASE_URL}/Debts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("CREATE ERROR:", err);
            throw new Error(err);
        }

        return res.json();
    },

    update: async (id, data) => {
        const payload = {
            id: data.id,
            userId: data.userId,
            debtName: data.debtName,
            totalAmount: Number(data.totalAmount),
            remainingAmount: Number(data.remainingAmount),
            interestRate: Number(data.interestRate) || 0,
            dueDate: toDateOnly(data.dueDate)
        };

        const res = await fetch(`${BASE_URL}/Debts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("UPDATE ERROR:", err);
            throw new Error(err);
        }

        return true;
    },

    delete: async (id) => {
        const res = await fetch(`${BASE_URL}/Debts/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Delete failed");
    }
};