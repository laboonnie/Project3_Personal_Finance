import { useState, useEffect } from "react";

const BASE_URL = "http://localhost:5084/api";
const userId = 1; // hardcode tạm

export default function Goals() {
    const [goals, setGoals] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showDeposit, setShowDeposit] = useState(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [form, setForm] = useState({
        goalName: "", targetAmount: "", deadline: ""
    });

    useEffect(() => { loadGoals(); }, []);

    const loadGoals = async () => {
        const res = await fetch(`${BASE_URL}/Goals`);
        const data = await res.json();
        setGoals(data.filter(g => g.userId === userId));
    };

    const handleCreate = async () => {
        if (!form.goalName || !form.targetAmount) return alert("Điền đầy đủ thông tin!");
        const res = await fetch(`${BASE_URL}/Goals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                goalName: form.goalName,
                targetAmount: parseFloat(form.targetAmount),
                deadline: form.deadline,
                currentAmount: 0,
                status: "in-progress",
                user: null
            })
        });
        if (res.ok) {
            setForm({ goalName: "", targetAmount: "", deadline: "" });
            setShowForm(false);
            loadGoals();
        }
    };

    const handleDeposit = async (goalId) => {
        if (!depositAmount) return alert("Nhập số tiền!");
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
        if (!window.confirm("Xóa goal này?")) return;
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

    const getStatusColor = (status) => {
        if (status === "completed") return "#22c55e";
        return "#f59e0b";
    };

    const getStatusText = (status) => {
        if (status === "completed") return "✅ Hoàn thành";
        return "⏳ Đang thực hiện";
    };

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <h2 style={s.title}>🎯 Mục tiêu tài chính</h2>
                <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
                    + Thêm mục tiêu
                </button>
            </div>

            {/* Form thêm goal */}
            {showForm && (
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Thêm mục tiêu mới</h3>
                    <div style={s.grid2}>
                        <div>
                            <label style={s.label}>Tên mục tiêu</label>
                            <input style={s.input} placeholder="VD: Du lịch Đà Nẵng"
                                value={form.goalName}
                                onChange={e => setForm({ ...form, goalName: e.target.value })} />
                        </div>
                        <div>
                            <label style={s.label}>Số tiền mục tiêu (₫)</label>
                            <input style={s.input} type="number" placeholder="VD: 10000000"
                                value={form.targetAmount}
                                onChange={e => setForm({ ...form, targetAmount: e.target.value })} />
                        </div>
                        <div>
                            <label style={s.label}>Deadline</label>
                            <input style={s.input} type="date"
                                value={form.deadline}
                                onChange={e => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                    </div>
                    <div style={s.row}>
                        <button style={s.btnPrimary} onClick={handleCreate}>💾 Lưu</button>
                        <button style={s.btnSecondary} onClick={() => setShowForm(false)}>Hủy</button>
                    </div>
                </div>
            )}

            {/* Danh sách goal */}
            {goals.length === 0 ? (
                <div style={s.empty}>🎯 Chưa có mục tiêu nào!</div>
            ) : goals.map(goal => (
                <div key={goal.id} style={s.card}>
                    <div style={s.goalTop}>
                        <div>
                            <h3 style={s.goalName}>{goal.goalName}</h3>
                            <span style={{
                                ...s.badge,
                                background: getStatusColor(goal.status)
                            }}>
                                {getStatusText(goal.status)}
                            </span>
                        </div>
                        <div style={s.row}>
                            {goal.status !== "completed" && (
                                <button style={s.btnPrimary}
                                    onClick={() => setShowDeposit(showDeposit === goal.id ? null : goal.id)}>
                                    💰 Nạp tiền
                                </button>
                            )}
                            <button style={s.btnDanger} onClick={() => handleDelete(goal.id)}>
                                🗑️
                            </button>
                        </div>
                    </div>

                    {/* Thông tin */}
                    <div style={s.grid3}>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Mục tiêu</span>
                            <span style={s.infoValue}>{formatMoney(goal.targetAmount)}</span>
                        </div>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Đã tích lũy</span>
                            <span style={{ ...s.infoValue, color: "#22c55e" }}>
                                {formatMoney(goal.currentAmount)}
                            </span>
                        </div>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Deadline</span>
                            <span style={s.infoValue}>
                                {goal.deadline
                                    ? new Date(goal.deadline).toLocaleDateString("vi-VN")
                                    : "Không có"}
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 12 }}>
                        <div style={s.progressBar}>
                            <div style={{
                                ...s.progressFill,
                                width: `${calcPercent(goal)}%`,
                                background: goal.status === "completed" ? "#22c55e" : "#6366f1"
                            }} />
                        </div>
                        <span style={s.progressText}>
                            {calcPercent(goal)}% hoàn thành
                        </span>
                    </div>

                    {/* Form nạp tiền */}
                    {showDeposit === goal.id && (
                        <div style={s.subCard}>
                            <h4 style={s.cardTitle}>💰 Nạp tiền vào mục tiêu</h4>
                            <div style={s.grid2}>
                                <div>
                                    <label style={s.label}>Số tiền nạp (₫)</label>
                                    <input style={s.input} type="number"
                                        placeholder="VD: 1000000"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)} />
                                </div>
                            </div>
                            <div style={s.row}>
                                <button style={s.btnPrimary} onClick={() => handleDeposit(goal.id)}>
                                    Xác nhận
                                </button>
                                <button style={s.btnSecondary} onClick={() => setShowDeposit(null)}>
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const s = {
    container: { maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "sans-serif", background: "#f9fafb", minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    title: { fontSize: 24, fontWeight: "bold", margin: 0 },
    card: { background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
    subCard: { background: "#f9fafb", borderRadius: 8, padding: 16, marginTop: 12 },
    cardTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 12, marginTop: 0 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 },
    row: { display: "flex", gap: 8, alignItems: "center" },
    label: { display: "block", fontSize: 12, color: "#888", marginBottom: 4 },
    input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, width: "100%", boxSizing: "border-box" },
    btnPrimary: { padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
    btnSecondary: { padding: "8px 16px", background: "#f3f4f6", color: "#333", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
    btnDanger: { padding: "8px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
    goalTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    goalName: { fontSize: 18, fontWeight: "bold", margin: "0 0 6px 0" },
    badge: { display: "inline-block", padding: "2px 10px", borderRadius: 20, color: "#fff", fontSize: 12 },
    infoBox: { display: "flex", flexDirection: "column", gap: 4 },
    infoLabel: { fontSize: 12, color: "#888" },
    infoValue: { fontSize: 14, fontWeight: "bold" },
    progressBar: { height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4, transition: "width 0.3s" },
    progressText: { fontSize: 12, color: "#888", marginTop: 4, display: "block" },
    empty: { textAlign: "center", padding: 48, color: "#888", fontSize: 16, background: "#fff", borderRadius: 12 }
};