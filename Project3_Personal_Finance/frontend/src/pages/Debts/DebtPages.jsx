import { useState, useEffect } from "react";
import { debtApi } from "../../api/debtApi";
import "./DebtPage.css";

const decodeBase64Url = (value) => {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
};

const getCurrentUserId = () => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return null;

        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payload = JSON.parse(decodeBase64Url(parts[1]));
        const rawUserId =
            payload.nameid ||
            payload.sub ||
            payload.userId ||
            payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

        const parsedUserId = Number(rawUserId);
        return Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
    } catch {
        return null;
    }
};

export default function DebtPage() {
    const userId = getCurrentUserId();
    const [debts, setDebts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showPayForm, setShowPayForm] = useState(null);
    const [form, setForm] = useState({
        debtName: "", totalAmount: "", interestRate: "", dueDate: ""
    });
    const [payAmount, setPayAmount] = useState("");

    useEffect(() => { loadDebts(); }, []);

    const loadDebts = async () => {
        if (!userId) {
            setDebts([]);
            return;
        }

        const data = await debtApi.getAll();
        setDebts(data.filter(d => d.userId === userId));
    };

    const handleCreate = async () => {
        if (!userId) return alert("Unable to retrieve user information. Please log in again!");
        if (!form.debtName || !form.totalAmount) return alert("Please fill in all required information!");
        await debtApi.create({
            userId,
            debtName: form.debtName,
            totalAmount: parseFloat(form.totalAmount),
            interestRate: parseFloat(form.interestRate) || 0,
            dueDate: form.dueDate
        });
        setForm({ debtName: "", totalAmount: "", interestRate: "", dueDate: "" });
        setShowForm(false);
        loadDebts();
    };

    const handlePay = async (debt) => {
        if (!payAmount) return alert("Please enter a payment amount!");
        const amount = parseFloat(payAmount);
        if (amount > debt.remainingAmount) return alert("Payment amount exceeds the remaining debt!");

        const newRemaining = debt.remainingAmount - amount;

        await debtApi.update(debt.id, {
            ...debt,
            remainingAmount: newRemaining
        });

        setShowPayForm(null);
        setPayAmount("");

        setTimeout(() => loadDebts(), 200);
    };

    const formatMoney = (amount) =>
        Number(amount).toLocaleString("vi-VN") + " ₫";

    const calcPercent = (debt) => {
        const total = parseFloat(debt.totalAmount) || 0;
        const remaining = parseFloat(debt.remainingAmount) || 0;
        if (total === 0) return 0;
        return Math.round(((total - remaining) / total) * 100);
    };

    const isDebtPaidOff = (debt) => Number(debt.remainingAmount) <= 0;

    return (
        <div className="debt-page-container">
            <div className="debt-page-header">
                <h2>💳 Debt Management</h2>
                <button className="debt-btn-primary" onClick={() => setShowForm(!showForm)}>
                    + Add debt
                </button>
            </div>

            {showForm && (
                <div className="debt-form-card">
                    <h3>Add new debt</h3>
                    <div className="debt-grid-2">
                        <div className="debt-form-group">
                            <label>Debt name</label>
                            <input
                                placeholder="e.g., Car loan"
                                value={form.debtName}
                                onChange={e => setForm({ ...form, debtName: e.target.value })} />
                        </div>

                        <div className="debt-form-group">
                            <label>Total debt (₫)</label>
                            <input
                                type="number"
                                placeholder="e.g., 10000000"
                                value={form.totalAmount}
                                onChange={e => setForm({ ...form, totalAmount: e.target.value })} />
                        </div>

                        <div className="debt-form-group">
                            <label>Interest rate (%/year)</label>
                            <input
                                type="number"
                                placeholder="e.g., 5.5"
                                value={form.interestRate}
                                onChange={e => setForm({ ...form, interestRate: e.target.value })} />
                        </div>

                        <div className="debt-form-group">
                            <label>Due date</label>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                    </div>

                    <div className="debt-actions">
                        <button className="debt-btn-primary" onClick={handleCreate}>💾 Save</button>
                        <button className="debt-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {debts.length === 0 ? (
                <div className="debt-empty">🎉 No debts yet!</div>
            ) : debts.map(debt => (
                <div key={debt.id} className="debt-card">
                    <div className="debt-top">
                        <div>
                            <h3 className="debt-name">{debt.debtName}</h3>
                            <span
                                className={`debt-badge ${isDebtPaidOff(debt) ? "paid-off" : "active"}`}
                            >
                                {isDebtPaidOff(debt) ? "✅ Paid off" : "⏳ Outstanding"}
                            </span>
                        </div>

                        <div className="debt-actions-inline">
                            {!isDebtPaidOff(debt) && (
                                <button
                                    className="debt-btn-primary"
                                    onClick={() => setShowPayForm(showPayForm === debt.id ? null : debt.id)}>
                                    💸 Make payment
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="debt-grid-4">
                        <div className="debt-info-box">
                            <span className="debt-info-label">Total debt</span>
                            <span className="debt-info-value">{formatMoney(debt.totalAmount)}</span>
                        </div>

                        <div className="debt-info-box">
                            <span className="debt-info-label">Remaining</span>
                            <span className="debt-info-value remaining">
                                {formatMoney(debt.remainingAmount)}
                            </span>
                        </div>

                        <div className="debt-info-box">
                            <span className="debt-info-label">Interest</span>
                            <span className="debt-info-value">{debt.interestRate}%/year</span>
                        </div>

                        <div className="debt-info-box">
                            <span className="debt-info-label">Due date</span>
                            <span className="debt-info-value">
                                {debt.dueDate
                                    ? new Date(debt.dueDate).toLocaleDateString("en-US")
                                    : "None"}
                            </span>
                        </div>
                    </div>

                    <div className="debt-progress-section">
                        <div className="debt-progress-bar">
                            <div className="debt-progress-fill" style={{ width: `${calcPercent(debt)}%` }} />
                        </div>
                        <span className="debt-progress-text">Paid: {calcPercent(debt)}%</span>
                    </div>

                    {showPayForm === debt.id && (
                        <div className="debt-sub-card">
                            <h4>💸 Make a payment</h4>

                            <div className="debt-grid-2">
                                <div className="debt-form-group">
                                    <label>Payment amount (₫)</label>
                                    <input
                                        type="number"
                                        placeholder={`Max: ${formatMoney(debt.remainingAmount)}`}
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)} />
                                </div>
                            </div>

                            <div className="debt-actions">
                                <button className="debt-btn-primary" onClick={() => handlePay(debt)}>
                                    Confirm
                                </button>
                                <button className="debt-btn-secondary" onClick={() => setShowPayForm(null)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}