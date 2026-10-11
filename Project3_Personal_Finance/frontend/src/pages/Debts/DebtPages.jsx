import { useState, useEffect } from "react";
import { authFetch, readJson, errorMessage, formatMoney, notifyDueAlertRefresh } from "../../api/authFetch";
import "./DebtPage.css";

const jarDisabled = (jar) =>
    !jar.hasCategory || jar.remaining === null || jar.remaining === undefined;

const jarLabel = (jar) => {
    if (!jar.hasCategory) return `${jar.jarName} (no category)`;
    if (jar.remaining === null || jar.remaining === undefined)
        return `${jar.jarName} (no budget this month)`;
    return `${jar.jarName} — ${formatMoney(jar.remaining)} left`;
};

export default function DebtPage() {
    const [debts, setDebts] = useState([]);
    const [jars, setJars] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showPayForm, setShowPayForm] = useState(null);
    const [form, setForm] = useState({
        debtName: "", totalAmount: "", interestRate: "", dueDate: ""
    });
    const [payAmount, setPayAmount] = useState("");
    const [jarId, setJarId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadDebts();
        loadJars();
    }, []);

    const loadDebts = async () => {
        try {
            const res = await authFetch("/Debts");
            const data = await readJson(res);
            setDebts(res.ok && Array.isArray(data) ? data : []);
        } catch {
            setDebts([]);
        }
    };

    const loadJars = async () => {
        try {
            const res = await authFetch("/FundingJars");
            const data = await readJson(res);
            setJars(res.ok && Array.isArray(data) ? data : []);
        } catch {
            setJars([]);
        }
    };

    const handleCreate = async () => {
        if (!form.debtName.trim() || !form.totalAmount)
            return alert("Please fill in all required information!");

        setSubmitting(true);
        try {
            const res = await authFetch("/Debts", {
                method: "POST",
                body: JSON.stringify({
                    debtName: form.debtName.trim(),
                    totalAmount: parseFloat(form.totalAmount),
                    interestRate: parseFloat(form.interestRate) || 0,
                    dueDate: form.dueDate || null
                })
            });
            const data = await readJson(res);
            if (!res.ok) return alert(errorMessage(data, "Unable to create debt!"));

            setForm({ debtName: "", totalAmount: "", interestRate: "", dueDate: "" });
            setShowForm(false);
            loadDebts();
            const debtId = data?.id ?? data?.Id;
            if (debtId != null) {
                notifyDueAlertRefresh("Debt", debtId);
            } else {
                console.error("The new debt was saved without an ID; due alerts were not refreshed.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const openPayForm = (debt) => {
        if (showPayForm === debt.id) {
            setShowPayForm(null);
            return;
        }
        setShowPayForm(debt.id);
        setPayAmount("");
        // Preselect the last source jar when it is still available.
        const last = jars.find(j => j.id === debt.jarId);
        setJarId(last && !jarDisabled(last) ? String(last.id) : "");
        loadJars();
    };

    // Fills the maximum payment allowed by both the remaining debt and jar balance.
    const fillMax = (debt) => {
        const remaining = Math.max(Number(debt.remainingAmount) || 0, 0);
        const jar = jars.find(j => String(j.id) === jarId);
        const cap = jar && jar.remaining !== null && jar.remaining !== undefined
            ? Math.max(jar.remaining, 0)
            : remaining;
        setPayAmount(String(Math.floor(Math.min(remaining, cap))));
    };

    const handlePay = async (debt) => {
        const amount = parseFloat(payAmount);
        if (!jarId) return alert("Please select a source jar!");
        if (!amount || amount <= 0) return alert("Please enter a payment amount!");
        if (amount > debt.remainingAmount) return alert("Payment amount exceeds the remaining debt!");

        setSubmitting(true);
        try {
            const res = await authFetch(`/Debts/${debt.id}/pay`, {
                method: "POST",
                body: JSON.stringify({ jarId: Number(jarId), amount })
            });
            const data = await readJson(res);
            if (!res.ok) return alert(errorMessage(data, "Payment failed!"));

            setShowPayForm(null);
            setPayAmount("");
            setJarId("");
            await Promise.all([loadDebts(), loadJars()]);
        } finally {
            setSubmitting(false);
        }
    };

    const calcPercent = (debt) => {
        const total = parseFloat(debt.totalAmount) || 0;
        const remaining = parseFloat(debt.remainingAmount) || 0;
        if (total === 0) return 0;
        return Math.round(((total - remaining) / total) * 100);
    };

    const isDebtPaidOff = (debt) => Number(debt.remainingAmount) <= 0;

    const getBadge = (debt) => {
        if (isDebtPaidOff(debt)) return { cls: "paid-off", text: "✅ Paid off" };
        if (debt.status === "overdue") return { cls: "locked", text: "⚠️ Overdue" };
        return { cls: "active", text: "⏳ Outstanding" };
    };

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
                        <button className="debt-btn-primary" disabled={submitting} onClick={handleCreate}>
                            💾 Save
                        </button>
                        <button className="debt-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {debts.length === 0 ? (
                <div className="debt-empty">🎉 No debts yet!</div>
            ) : debts.map(debt => {
                const badge = getBadge(debt);
                return (
                    <div key={debt.id} className={`debt-card ${debt.status === "overdue" ? "is-locked" : ""}`}>
                        <div className="debt-top">
                            <div>
                                <h3 className="debt-name">{debt.debtName}</h3>
                                <span className={`debt-badge ${badge.cls}`}>{badge.text}</span>
                            </div>

                            <div className="debt-actions-inline">
                                {!isDebtPaidOff(debt) && (
                                    <button
                                        className="debt-btn-primary"
                                        onClick={() => openPayForm(debt)}>
                                        💸 Make payment
                                    </button>
                                )}
                            </div>
                        </div>

                        {debt.warning && !isDebtPaidOff(debt) && (
                            <div className={`debt-warning ${debt.status === "overdue" ? "overdue" : "soon"}`}>
                                {debt.status === "overdue" ? "⚠️" : "⏰"} {debt.warning}
                            </div>
                        )}

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
                                        ? new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString("en-GB")
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
                                        <label>Source jar</label>
                                        <select value={jarId} onChange={e => setJarId(e.target.value)}>
                                            <option value="">-- Select a jar --</option>
                                            {jars.map(j => (
                                                <option key={j.id} value={j.id} disabled={jarDisabled(j)}>
                                                    {jarLabel(j)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="debt-form-group">
                                        <div className="debt-label-row">
                                            <label>Payment amount (₫)</label>
                                            <button type="button" className="debt-max-btn" onClick={() => fillMax(debt)}>
                                                Max
                                            </button>
                                        </div>
                                        <input
                                            type="number"
                                            placeholder={`Max: ${formatMoney(debt.remainingAmount)}`}
                                            value={payAmount}
                                            onChange={e => setPayAmount(e.target.value)} />
                                    </div>
                                </div>

                                <div className="debt-actions">
                                    <button className="debt-btn-primary" disabled={submitting}
                                        onClick={() => handlePay(debt)}>
                                        Confirm
                                    </button>
                                    <button className="debt-btn-secondary" onClick={() => setShowPayForm(null)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}