import { useState, useEffect } from "react";
import { debtApi } from "../../api/debtApi";

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
    const [showHistory, setShowHistory] = useState(null);
    const [history, setHistory] = useState([]);
    const [form, setForm] = useState({
        debtName: "", totalAmount: "", interestRate: "", dueDate: ""
    });
    const [payAmount, setPayAmount] = useState("");
    const [payNote, setPayNote] = useState("");

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
        if (!userId) return alert("Không lấy được thông tin người dùng. Vui lòng đăng nhập lại!");
        if (!form.debtName || !form.totalAmount) return alert("Điền đầy đủ thông tin!");
        await debtApi.create({
            userId,
            debtName: form.debtName,
            totalAmount: parseFloat(form.totalAmount),
            remainingAmount: parseFloat(form.totalAmount),
            interestRate: parseFloat(form.interestRate) || 0,
            dueDate: form.dueDate,
            status: "active"
        });
        setForm({ debtName: "", totalAmount: "", interestRate: "", dueDate: "" });
        setShowForm(false);
        loadDebts();
    };

    const handlePay = async (debt) => {
        if (!payAmount) return alert("Nhập số tiền trả!");
        const amount = parseFloat(payAmount);
        if (amount > debt.remainingAmount) return alert("Số tiền vượt quá số nợ còn lại!");

        const newRemaining = debt.remainingAmount - amount;

        await debtApi.update(debt.id, {
            ...debt,
            user: null,
            payments: [],
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? "paid_off" : "active"
        });

        await debtApi.addPayment({
            debtId: debt.id,
            amountPaid: amount,
            paymentDate: new Date().toISOString(),
            note: payNote || ""
        });

        setShowPayForm(null);
        setPayAmount("");
        setPayNote("");

        setTimeout(() => loadDebts(), 200);
    };

    const handleHistory = async (debtId) => {
        const data = await debtApi.getPayments(debtId);
        setHistory(data);
        setShowHistory(debtId);
    };

    const formatMoney = (amount) =>
        Number(amount).toLocaleString("vi-VN") + " ₫";

    const calcPercent = (debt) => {
        const total = parseFloat(debt.totalAmount) || 0;
        const remaining = parseFloat(debt.remainingAmount) || 0;
        if (total === 0) return 0;
        return Math.round(((total - remaining) / total) * 100);
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <h2 style={s.title}>💳 Quản lý Nợ</h2>
                <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
                    + Thêm khoản nợ
                </button>
            </div>

            {showForm && (
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Thêm khoản nợ mới</h3>
                    <div style={s.grid2}>
                        <div>
                            <label style={s.label}>Tên khoản nợ</label>
                            <input style={s.input} placeholder="VD: Vay mua xe"
                                value={form.debtName}
                                onChange={e => setForm({ ...form, debtName: e.target.value })} />
                        </div>
                        <div>
                            <label style={s.label}>Tổng số nợ (₫)</label>
                            <input style={s.input} type="number" placeholder="VD: 10000000"
                                value={form.totalAmount}
                                onChange={e => setForm({ ...form, totalAmount: e.target.value })} />
                        </div>
                        <div>
                            <label style={s.label}>Lãi suất (%/năm)</label>
                            <input style={s.input} type="number" placeholder="VD: 5.5"
                                value={form.interestRate}
                                onChange={e => setForm({ ...form, interestRate: e.target.value })} />
                        </div>
                        <div>
                            <label style={s.label}>Ngày đến hạn</label>
                            <input style={s.input} type="date"
                                value={form.dueDate}
                                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <div style={s.row}>
                        <button style={s.btnPrimary} onClick={handleCreate}>💾 Lưu</button>
                        <button style={s.btnSecondary} onClick={() => setShowForm(false)}>Hủy</button>
                    </div>
                </div>
            )}

            {debts.length === 0 ? (
                <div style={s.empty}>🎉 Không có khoản nợ nào!</div>
            ) : debts.map(debt => (
                <div key={debt.id} style={s.card}>
                    <div style={s.debtTop}>
                        <div>
                            <h3 style={s.debtName}>{debt.debtName}</h3>
                            <span style={{
                                ...s.badge,
                                background: debt.status === "paid_off" ? "#22c55e" : "#f59e0b"
                            }}>
                                {debt.status === "paid_off" ? "✅ Đã trả hết" : "⏳ Còn nợ"}
                            </span>
                        </div>
                        <div style={s.row}>
                            {debt.status !== "paid_off" && (
                                <button style={s.btnPrimary}
                                    onClick={() => setShowPayForm(showPayForm === debt.id ? null : debt.id)}>
                                    💸 Trả nợ
                                </button>
                            )}
                            <button style={s.btnSecondary}
                                onClick={() => handleHistory(debt.id)}>
                                📋 Lịch sử
                            </button>
                        </div>
                    </div>

                    <div style={s.grid4}>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Tổng nợ</span>
                            <span style={s.infoValue}>{formatMoney(debt.totalAmount)}</span>
                        </div>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Còn lại</span>
                            <span style={{ ...s.infoValue, color: "#ef4444" }}>
                                {formatMoney(debt.remainingAmount)}
                            </span>
                        </div>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Lãi suất</span>
                            <span style={s.infoValue}>{debt.interestRate}%/năm</span>
                        </div>
                        <div style={s.infoBox}>
                            <span style={s.infoLabel}>Đến hạn</span>
                            <span style={s.infoValue}>
                                {new Date(debt.dueDate).toLocaleDateString("vi-VN")}
                            </span>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <div style={s.progressBar}>
                            <div style={{
                                ...s.progressFill,
                                width: `${calcPercent(debt)}%`
                            }} />
                        </div>
                        <span style={s.progressText}>Đã trả: {calcPercent(debt)}%</span>
                    </div>

                    {showPayForm === debt.id && (
                        <div style={s.subCard}>
                            <h4 style={s.cardTitle}>💸 Trả nợ</h4>
                            <div style={s.grid2}>
                                <div>
                                    <label style={s.label}>Số tiền trả (₫)</label>
                                    <input style={s.input} type="number"
                                        placeholder={`Tối đa: ${formatMoney(debt.remainingAmount)}`}
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)} />
                                </div>
                                <div>
                                    <label style={s.label}>Ghi chú</label>
                                    <input style={s.input} placeholder="VD: Trả lần 1"
                                        value={payNote}
                                        onChange={e => setPayNote(e.target.value)} />
                                </div>
                            </div>
                            <div style={s.row}>
                                <button style={s.btnPrimary} onClick={() => handlePay(debt)}>
                                    Xác nhận
                                </button>
                                <button style={s.btnSecondary} onClick={() => setShowPayForm(null)}>
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}

                    {showHistory === debt.id && (
                        <div style={s.subCard}>
                            <h4 style={s.cardTitle}>📋 Lịch sử trả nợ</h4>
                            {history.length === 0 ? (
                                <p style={{ color: "#888" }}>Chưa có lịch sử</p>
                            ) : history.map(h => (
                                <div key={h.id} style={s.historyRow}>
                                    <span>{new Date(h.paymentDate).toLocaleDateString("vi-VN")}</span>
                                    <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                                        -{formatMoney(h.amountPaid)}
                                    </span>
                                    <span style={{ color: "#888" }}>{h.note}</span>
                                </div>
                            ))}
                            <button style={{ ...s.btnSecondary, marginTop: 8 }}
                                onClick={() => setShowHistory(null)}>
                                Đóng
                            </button>
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
    grid4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 12 },
    row: { display: "flex", gap: 8, alignItems: "center" },
    label: { display: "block", fontSize: 12, color: "#888", marginBottom: 4 },
    input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, width: "100%", boxSizing: "border-box" },
    btnPrimary: { padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
    btnSecondary: { padding: "8px 16px", background: "#f3f4f6", color: "#333", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
    debtTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    debtName: { fontSize: 18, fontWeight: "bold", margin: "0 0 6px 0" },
    badge: { display: "inline-block", padding: "2px 10px", borderRadius: 20, color: "#fff", fontSize: 12 },
    infoBox: { display: "flex", flexDirection: "column", gap: 4 },
    infoLabel: { fontSize: 12, color: "#888" },
    infoValue: { fontSize: 14, fontWeight: "bold" },
    progressBar: { height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", background: "#6366f1", borderRadius: 4, transition: "width 0.3s" },
    progressText: { fontSize: 12, color: "#888", marginTop: 4, display: "block" },
    historyRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
    empty: { textAlign: "center", padding: 48, color: "#888", fontSize: 16, background: "#fff", borderRadius: 12 }
};