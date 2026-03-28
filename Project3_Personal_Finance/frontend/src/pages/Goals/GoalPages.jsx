import { useState, useEffect } from "react";
import "./GoalPage.css";

const BASE_URL = "http://localhost:5084/api";

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

export default function Goals() {
    const userId = getCurrentUserId();
    const [goals, setGoals] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showDeposit, setShowDeposit] = useState(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [form, setForm] = useState({
        goalName: "", targetAmount: "", deadline: ""
    });

    useEffect(() => { loadGoals(); }, []);

    const loadGoals = async () => {
        if (!userId) {
            setGoals([]);
            return;
        }

        const res = await fetch(`${BASE_URL}/Goals`);
        const data = await res.json();
        setGoals(data.filter(g => g.userId === userId));
    };

    const handleCreate = async () => {
        if (!userId) return alert("Unable to retrieve user information. Please log in again!");
        if (!form.goalName || !form.targetAmount) return alert("Please fill in all required information!");
        const res = await fetch(`${BASE_URL}/Goals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                goalName: form.goalName,
                targetAmount: parseFloat(form.targetAmount),
                deadline: form.deadline || null
            })
        });
        if (res.ok) {
            setForm({ goalName: "", targetAmount: "", deadline: "" });
            setShowForm(false);
            loadGoals();
        }
    };

    const handleDeposit = async (goalId) => {
        if (!depositAmount) return alert("Please enter an amount!");
        const res = await fetch(`${BASE_URL}/Goals/${goalId}/deposit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parseFloat(depositAmount))
        });
        if (res.ok) {
            setShowDeposit(null);
            setDepositAmount("");
            setTimeout(() => loadGoals(), 200);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this goal?")) return;
        await fetch(`${BASE_URL}/Goals/${id}`, { method: "DELETE" });
        loadGoals();
    };

    const calcPercent = (goal) => {
        const target = parseFloat(goal.targetAmount) || 0;
        const current = parseFloat(goal.currentAmount) || 0;
        if (target === 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    };

    const formatMoney = (amount) =>
        Number(amount).toLocaleString("vi-VN") + " ₫";

    const getStatusText = (status) => {
        if (status === "completed") return "✅ Completed";
        return "⏳ In progress";
    };

    return (
        <div className="goal-page-container">
            <div className="goal-page-header">
                <h2>🎯 Financial Goals</h2>
                <button className="goal-btn-primary" onClick={() => setShowForm(!showForm)}>
                    + Add goal
                </button>
            </div>

            {showForm && (
                <div className="goal-form-card">
                    <h3>Add new goal</h3>
                    <div className="goal-grid-2">
                        <div className="goal-form-group">
                            <label>Goal name</label>
                            <input placeholder="e.g., Da Nang trip"
                                value={form.goalName}
                                onChange={e => setForm({ ...form, goalName: e.target.value })} />
                        </div>
                        <div className="goal-form-group">
                            <label>Target amount (₫)</label>
                            <input type="number" placeholder="e.g., 10000000"
                                value={form.targetAmount}
                                onChange={e => setForm({ ...form, targetAmount: e.target.value })} />
                        </div>
                        <div className="goal-form-group">
                            <label>Deadline</label>
                            <input type="date"
                                value={form.deadline}
                                onChange={e => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                    </div>
                    <div className="goal-actions">
                        <button className="goal-btn-primary" onClick={handleCreate}>💾 Save</button>
                        <button className="goal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {goals.length === 0 ? (
                <div className="goal-empty">🎯 No goals yet!</div>
            ) : goals.map(goal => (
                <div key={goal.id} className="goal-card">
                    <div className="goal-top">
                        <div>
                            <h3 className="goal-name">{goal.goalName}</h3>
                            <span className={`goal-badge ${goal.status === "completed" ? "completed" : "in-progress"}`}>
                                {getStatusText(goal.status)}
                            </span>
                        </div>
                        <div className="goal-actions-inline">
                            {goal.status !== "completed" && (
                                <button className="goal-btn-primary"
                                    onClick={() => setShowDeposit(showDeposit === goal.id ? null : goal.id)}>
                                    💰 Deposit
                                </button>
                            )}
                            <button className="goal-btn-danger" onClick={() => handleDelete(goal.id)}>
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div className="goal-grid-3">
                        <div className="goal-info-box">
                            <span className="goal-info-label">Goal</span>
                            <span className="goal-info-value">{formatMoney(goal.targetAmount)}</span>
                        </div>
                        <div className="goal-info-box">
                            <span className="goal-info-label">Saved</span>
                            <span className="goal-info-value saved">
                                {formatMoney(goal.currentAmount)}
                            </span>
                        </div>
                        <div className="goal-info-box">
                            <span className="goal-info-label">Deadline</span>
                            <span className="goal-info-value">
                                {goal.deadline
                                    ? new Date(goal.deadline).toLocaleDateString("vi-VN")
                                    : "None"}
                            </span>
                        </div>
                    </div>

                    <div className="goal-progress-section">
                        <div className="goal-progress-bar">
                            <div
                                className={`goal-progress-fill ${goal.status === "completed" ? "completed" : "in-progress"}`}
                                style={{ width: `${calcPercent(goal)}%` }}
                            />
                        </div>
                        <span className="goal-progress-text">
                            {calcPercent(goal)}% completed
                        </span>
                    </div>

                    {showDeposit === goal.id && (
                        <div className="goal-sub-card">
                            <h4>💰 Deposit into goal</h4>
                            <div className="goal-grid-2">
                                <div className="goal-form-group">
                                    <label>Deposit amount (₫)</label>
                                    <input type="number"
                                        placeholder="e.g., 1000000"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="goal-actions">
                                <button className="goal-btn-primary" onClick={() => handleDeposit(goal.id)}>
                                    Confirm
                                </button>
                                <button className="goal-btn-secondary" onClick={() => setShowDeposit(null)}>
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