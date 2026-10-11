import { useState, useEffect } from "react";
import { authFetch, readJson, errorMessage, formatMoney, notifyDueAlertRefresh } from "../../api/authFetch";
import "./GoalPage.css";

const jarDisabled = (jar) =>
    !jar.hasCategory || jar.remaining === null || jar.remaining === undefined;

const jarLabel = (jar) => {
    if (!jar.hasCategory) return `${jar.jarName} (no category)`;
    if (jar.remaining === null || jar.remaining === undefined)
        return `${jar.jarName} (no budget this month)`;
    return `${jar.jarName} — ${formatMoney(jar.remaining)} left`;
};

export default function Goals() {
    const [goals, setGoals] = useState([]);
    const [jars, setJars] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showDeposit, setShowDeposit] = useState(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [jarId, setJarId] = useState("");
    const [editingGoalId, setEditingGoalId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        goalName: "",
        targetAmount: "",
        deadline: "",
        autoPayEnabled: false,
        autoPayJarId: "",
        autoPayAmount: "",
        autoPayStartDate: "",
        autoPayCycle: "monthly"
    });

    useEffect(() => {
        loadGoals();
        loadJars();
    }, []);

    const loadGoals = async () => {
        try {
            const res = await authFetch("/Goals");
            const data = await readJson(res);
            setGoals(res.ok && Array.isArray(data) ? data : []);
        } catch {
            setGoals([]);
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

    const openCreateForm = () => {
        setEditingGoalId(null);
        setForm({
            goalName: "",
            targetAmount: "",
            deadline: "",
            autoPayEnabled: false,
            autoPayJarId: "",
            autoPayAmount: "",
            autoPayStartDate: "",
            autoPayCycle: "monthly"
        });
        setShowForm(true);
    };

    const openEditForm = (goal) => {
        setEditingGoalId(goal.id);
        setForm({
            goalName: goal.goalName || "",
            targetAmount: String(goal.targetAmount ?? ""),
            deadline: goal.deadline || "",
            autoPayEnabled: Boolean(goal.autoPayEnabled),
            autoPayJarId: String(goal.autoPayJarId ?? ""),
            autoPayAmount: String(goal.autoPayAmount ?? ""),
            autoPayStartDate: goal.autoPayStartDate || "",
            autoPayCycle: goal.autoPayCycle || "monthly"
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.goalName.trim() || !form.targetAmount)
            return alert("Please fill in all required information!");
        if (form.autoPayEnabled &&
            (!form.autoPayJarId || !form.autoPayAmount || !form.autoPayStartDate))
            return alert("Complete all automatic payment settings.");

        setSubmitting(true);
        try {
            const isCreating = editingGoalId == null;
            const res = await authFetch(editingGoalId ? `/Goals/${editingGoalId}` : "/Goals", {
                method: editingGoalId ? "PUT" : "POST",
                body: JSON.stringify({
                    goalName: form.goalName.trim(),
                    targetAmount: parseFloat(form.targetAmount),
                    deadline: form.deadline || null,
                    autoPayEnabled: form.autoPayEnabled,
                    autoPayJarId: form.autoPayEnabled ? Number(form.autoPayJarId) : null,
                    autoPayAmount: form.autoPayEnabled ? parseFloat(form.autoPayAmount) : null,
                    autoPayStartDate: form.autoPayEnabled ? form.autoPayStartDate : null,
                    autoPayCycle: form.autoPayEnabled ? form.autoPayCycle : null
                })
            });
            const data = await readJson(res);
            if (!res.ok) return alert(errorMessage(data, "Unable to save goal."));

            setEditingGoalId(null);
            setForm({
                goalName: "",
                targetAmount: "",
                deadline: "",
                autoPayEnabled: false,
                autoPayJarId: "",
                autoPayAmount: "",
                autoPayStartDate: "",
                autoPayCycle: "monthly"
            });
            setShowForm(false);
            if (isCreating) {
                const goalId = data?.id ?? data?.Id;
                if (goalId != null) {
                    notifyDueAlertRefresh("Goal", goalId);
                } else {
                    console.error("The new goal was saved without an ID; due alerts were not refreshed.");
                }
            }
            await loadGoals();
        } finally {
            setSubmitting(false);
        }
    };

    const openDeposit = (goal) => {
        if (showDeposit === goal.id) {
            setShowDeposit(null);
            return;
        }
        setShowDeposit(goal.id);
        setDepositAmount("");
        // Preselect the last source jar when it is still available.
        const last = jars.find(j => j.id === goal.jarId);
        setJarId(last && !jarDisabled(last) ? String(last.id) : "");
        loadJars();
    };

    // Fills the maximum deposit allowed by both the remaining goal amount and jar balance.
    const fillMax = (goal) => {
        const needed = Math.max((goal.targetAmount || 0) - (goal.currentAmount || 0), 0);
        const jar = jars.find(j => String(j.id) === jarId);
        const cap = jar && jar.remaining !== null && jar.remaining !== undefined
            ? Math.max(jar.remaining, 0)
            : needed;
        setDepositAmount(String(Math.floor(Math.min(needed, cap))));
    };

    const handleDeposit = async (goal) => {
        const amount = parseFloat(depositAmount);
        if (!jarId) return alert("Please select a source jar!");
        if (!amount || amount <= 0) return alert("Please enter a valid amount!");

        setSubmitting(true);
        try {
            const res = await authFetch(`/Goals/${goal.id}/deposit`, {
                method: "POST",
                body: JSON.stringify({ jarId: Number(jarId), amount })
            });
            const data = await readJson(res);
            if (!res.ok) return alert(errorMessage(data, "Deposit failed!"));

            setShowDeposit(null);
            setDepositAmount("");
            setJarId("");
            await Promise.all([loadGoals(), loadJars()]);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this goal?")) return;
        const res = await authFetch(`/Goals/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await readJson(res);
            return alert(errorMessage(data, "Unable to delete goal!"));
        }
        loadGoals();
    };

    const calcPercent = (goal) => {
        const target = parseFloat(goal.targetAmount) || 0;
        const current = parseFloat(goal.currentAmount) || 0;
        if (target === 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    };

    const getStatusText = (goal) => {
        if (goal.status === "completed") return "✅ Completed";
        if (goal.isLocked) return "🔒 Locked";
        if (goal.dueStatus === "overdue") return "⚠️ Overdue";
        return "⏳ In progress";
    };

    const getBadgeClass = (goal) => {
        if (goal.status === "completed") return "completed";
        if (goal.isLocked) return "locked";
        if (goal.dueStatus === "overdue") return "overdue";
        return "in-progress";
    };

    return (
        <div className="goal-page-container">
            <div className="goal-page-header">
                <h2>🎯 Financial Goals</h2>
                <button className="goal-btn-primary" onClick={openCreateForm}>
                    + Add goal
                </button>
            </div>

            {showForm && (
                <div className="goal-form-card">
                    <h3>{editingGoalId ? "Edit goal" : "Add new goal"}</h3>
                    <div className="goal-grid-2">
                        <div className="goal-form-group">
                            <label htmlFor="goal-name">Goal name</label>
                            <input placeholder="e.g., Da Nang trip"
                                id="goal-name"
                                value={form.goalName}
                                onChange={e => setForm({ ...form, goalName: e.target.value })} />
                        </div>
                        <div className="goal-form-group">
                            <label htmlFor="goal-target-amount">Target amount (₫)</label>
                            <input type="number" placeholder="e.g., 10000000"
                                id="goal-target-amount"
                                value={form.targetAmount}
                                onChange={e => setForm({ ...form, targetAmount: e.target.value })} />
                        </div>
                        <div className="goal-form-group">
                            <label htmlFor="goal-deadline">Deadline</label>
                            <input type="date"
                                id="goal-deadline"
                                value={form.deadline}
                                onChange={e => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                        <div className="goal-form-group goal-autopay-toggle">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={form.autoPayEnabled}
                                    onChange={e => setForm({ ...form, autoPayEnabled: e.target.checked })} />
                                Enable automatic payments
                            </label>
                        </div>
                        {form.autoPayEnabled && (
                            <>
                                <div className="goal-form-group">
                                    <label htmlFor="goal-auto-pay-jar">Automatic payment source jar</label>
                                    <select
                                        id="goal-auto-pay-jar"
                                        value={form.autoPayJarId}
                                        onChange={e => setForm({ ...form, autoPayJarId: e.target.value })}>
                                        <option value="">-- Select a jar --</option>
                                        {jars.map(jar => (
                                            <option key={jar.id} value={jar.id} disabled={!jar.hasCategory}>
                                                {jar.jarName}{!jar.hasCategory ? " (no expense category)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="goal-form-group">
                                    <label htmlFor="goal-auto-pay-amount">Payment amount (VND)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        id="goal-auto-pay-amount"
                                        value={form.autoPayAmount}
                                        onChange={e => setForm({ ...form, autoPayAmount: e.target.value })} />
                                </div>
                                <div className="goal-form-group">
                                    <label htmlFor="goal-auto-pay-start-date">First payment date</label>
                                    <input
                                        type="date"
                                        id="goal-auto-pay-start-date"
                                        value={form.autoPayStartDate}
                                        onChange={e => setForm({ ...form, autoPayStartDate: e.target.value })} />
                                </div>
                                <div className="goal-form-group">
                                    <label htmlFor="goal-auto-pay-cycle">Payment cycle</label>
                                    <select
                                        id="goal-auto-pay-cycle"
                                        value={form.autoPayCycle}
                                        onChange={e => setForm({ ...form, autoPayCycle: e.target.value })}>
                                        <option value="once">One time</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="goal-actions">
                        <button className="goal-btn-primary" disabled={submitting} onClick={handleSave}>
                            💾 Save
                        </button>
                        <button className="goal-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {goals.length === 0 ? (
                <div className="goal-empty">🎯 No goals yet!</div>
            ) : goals.map(goal => (
                <div key={goal.id} className={`goal-card ${goal.isLocked ? "is-locked" : ""}`}>
                    <div className="goal-top">
                        <div>
                            <h3 className="goal-name">{goal.goalName}</h3>
                            <span className={`goal-badge ${getBadgeClass(goal)}`}>
                                {getStatusText(goal)}
                            </span>
                        </div>
                        <div className="goal-actions-inline">
                            <button className="goal-btn-secondary" onClick={() => openEditForm(goal)}>
                                Edit
                            </button>
                            {goal.status !== "completed" && (
                                <button className="goal-btn-primary"
                                    disabled={goal.isLocked}
                                    title={goal.isLocked ? "Goal is locked (past deadline)" : ""}
                                    onClick={() => openDeposit(goal)}>
                                    {goal.isLocked ? "🔒 Locked" : "💰 Deposit"}
                                </button>
                            )}
                            <button className="goal-btn-danger" onClick={() => handleDelete(goal.id)}>
                                🗑️
                            </button>
                        </div>
                    </div>

                    {goal.autoPayEnabled && (
                        <div className="goal-warning soon">
                            Automatic payment: {formatMoney(goal.autoPayAmount)} from {goal.jarName || "selected jar"}
                            {" · "}{goal.autoPayCycle} · Next: {goal.autoPayNextPaymentDate || "Complete"}
                        </div>
                    )}

                    {goal.warning && goal.status !== "completed" && (
                        <div className={`goal-warning ${goal.dueStatus === "overdue" ? "overdue" : "soon"}`}>
                            {goal.dueStatus === "overdue" ? "⚠️" : "⏰"} {goal.warning}
                        </div>
                    )}

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
                                    ? new Date(`${goal.deadline}T00:00:00`).toLocaleDateString("en-GB")
                                    : "None"}
                            </span>
                        </div>
                    </div>

                    <div className="goal-progress-section">
                        <div className="goal-progress-bar">
                            <div
                                className={`goal-progress-fill ${getBadgeClass(goal)}`}
                                style={{ width: `${calcPercent(goal)}%` }}
                            />
                        </div>
                        <span className="goal-progress-text">
                            {calcPercent(goal)}% completed
                        </span>
                    </div>

                    {showDeposit === goal.id && !goal.isLocked && (
                        <div className="goal-sub-card">
                            <h4>💰 Deposit into goal</h4>
                            <div className="goal-grid-2">
                                <div className="goal-form-group">
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
                                <div className="goal-form-group">
                                    <div className="goal-label-row">
                                        <label>Deposit amount (₫)</label>
                                        <button type="button" className="goal-max-btn" onClick={() => fillMax(goal)}>
                                            Max
                                        </button>
                                    </div>
                                    <input type="number"
                                        placeholder="e.g., 1000000"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="goal-actions">
                                <button className="goal-btn-primary" disabled={submitting}
                                    onClick={() => handleDeposit(goal)}>
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