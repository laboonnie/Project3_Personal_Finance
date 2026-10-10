import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch, readJson, formatMoney } from "../../api/authFetch";
import "./Duealertpopup.css";

const SHOWN_KEY = "dueAlertShownFor";

const formatDate = (value) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";

const STATUS = {
    "auto-paid": { label: "Auto-paid", cls: "paid" },
    "auto-failed": { label: "Auto-pay failed", cls: "overdue" },
    "overdue": { label: "Overdue", cls: "overdue" },
    "due-soon": { label: "Due soon", cls: "soon" }
};

const alertEntityKey = (item) => `${item.kind}:${item.entityId}`;

const toAlertItem = (a) => ({
    key: `alert-${a.notificationId}`,
    id: a.notificationId,
    icon: a.kind === "Goal" ? "🎯" : "💳",
    kind: a.kind,
    name: a.name,
    status: a.status,
    message: a.message,
    amount: a.amount,
    dueDate: a.dueDate,
    jarName: a.jarName,
    reason: a.reason,
    entityId: a.entityId,
    canConfirmPayment: a.canConfirmPayment,
    alternativeJars: a.alternativeJars || [],
    days: a.daysUntilDue ?? 0
});

/**
 * Shows goal and debt alerts after sign-in. Dismissing an alert marks it as read;
 * scheduled charges are created by the backend or after explicit confirmation.
 */
export default function DueAlertPopup() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [jarSelections, setJarSelections] = useState({});
    const [confirmingId, setConfirmingId] = useState(null);
    const [confirmationErrors, setConfirmationErrors] = useState({});
    const seenEntityKeysRef = useRef(new Set());

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        if (sessionStorage.getItem(SHOWN_KEY) === token) return;

        let cancelled = false;
        let retryTimer;

        const scheduleRetry = () => {
            if (!cancelled) retryTimer = window.setTimeout(load, 60000);
        };

        async function load() {
            try {
                const res = await authFetch("/DueAlerts");
                if (!res.ok) {
                    console.error(`Loading due alerts failed with HTTP ${res.status}`);
                    scheduleRetry();
                    return;
                }
                const data = await readJson(res);
                if (!Array.isArray(data)) {
                    scheduleRetry();
                    return;
                }

                const list = data
                    .map(toAlertItem)
                    .sort((x, y) => x.days - y.days);

                if (cancelled) return;
                if (list.length === 0) {
                    scheduleRetry();
                    return;
                }
                list.forEach(item => seenEntityKeysRef.current.add(alertEntityKey(item)));
                setItems(current => {
                    const currentIds = new Set(current.map(item => item.id));
                    return [...list.filter(item => !currentIds.has(item.id)), ...current];
                });
                sessionStorage.setItem(SHOWN_KEY, token);
                setOpen(true);
            } catch (error) {
                console.error("Loading due alerts failed", error);
                scheduleRetry();
            }
        }

        load();
        return () => {
            cancelled = true;
            window.clearTimeout(retryTimer);
        };
    }, []);

    useEffect(() => {
        const refreshCreatedEntity = async (event) => {
            const { kind, entityId } = event.detail || {};
            if (!["Goal", "Debt"].includes(kind) || entityId == null) return;

            const entityKey = `${kind}:${entityId}`;
            if (seenEntityKeysRef.current.has(entityKey)) return;

            try {
                const response = await authFetch("/DueAlerts");
                if (!response.ok) {
                    console.error(`Refreshing due alerts failed with HTTP ${response.status}`);
                    return;
                }
                const data = await readJson(response);
                if (!Array.isArray(data)) {
                    console.error("Refreshing due alerts returned an invalid response.");
                    return;
                }

                const alert = data.find(item =>
                    item.kind === kind
                    && Number(item.entityId) === Number(entityId)
                    && ["due-soon", "overdue"].includes(item.status));
                if (!alert) return;

                seenEntityKeysRef.current.add(entityKey);
                const item = toAlertItem(alert);
                setItems(current => current.some(existing => existing.id === item.id)
                    ? current
                    : [...current, item].sort((a, b) => a.days - b.days));
                setOpen(true);
            } catch (error) {
                console.error("Refreshing due alerts failed", error);
            }
        };

        window.addEventListener("due-alerts-refresh", refreshCreatedEntity);
        return () => window.removeEventListener("due-alerts-refresh", refreshCreatedEntity);
    }, []);

    const confirmPayment = async (item) => {
        const selectedJarId = Number(jarSelections[item.id]);
        if (!selectedJarId) {
            setConfirmationErrors(errors => ({ ...errors, [item.id]: "Select another source jar." }));
            return;
        }

        setConfirmingId(item.id);
        setConfirmationErrors(errors => ({ ...errors, [item.id]: "" }));
        try {
            const response = await authFetch("/DueAlerts/confirm-payment", {
                method: "POST",
                body: JSON.stringify({ notificationId: item.id, jarId: selectedJarId })
            });
            const result = await readJson(response);
            if (!response.ok) {
                setConfirmationErrors(errors => ({
                    ...errors,
                    [item.id]: result?.message || "The payment could not be confirmed."
                }));
                return;
            }

            setItems(current => current.map(existing => existing.id === item.id
                ? {
                    ...existing,
                    status: "auto-paid",
                    message: `Payment confirmed: ${formatMoney(result.paid)} charged to the selected jar.`,
                    jarName: item.alternativeJars.find(jar => jar.id === selectedJarId)?.name
                        || existing.jarName,
                    canConfirmPayment: false
                }
                : existing));
            setJarSelections(selections => ({ ...selections, [item.id]: "" }));
        } catch (error) {
            console.error("Confirming the scheduled payment failed", error);
            setConfirmationErrors(errors => ({
                ...errors,
                [item.id]: "A network error prevented the payment from being confirmed."
            }));
        } finally {
            setConfirmingId(null);
        }
    };

    const closeAndMarkRead = useCallback(() => {
        setOpen(false);

        const token = localStorage.getItem("token");
        if (token) sessionStorage.setItem(SHOWN_KEY, token);

        const ids = items.map(i => i.id).filter(Boolean);
        setItems([]);
        if (ids.length === 0) return;

        authFetch("/DueAlerts/mark-read", {
            method: "POST",
            body: JSON.stringify({ ids })
        }).catch(error => console.error("Marking due alerts as read failed", error));
    }, [items]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") closeAndMarkRead(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, closeAndMarkRead]);

    if (!open) return null;

    const autoPaid = items.filter(i => i.status === "auto-paid");
    const action = items.filter(i => i.status === "overdue" || i.status === "auto-failed");
    const soon = items.filter(i => i.status === "due-soon");

    const hasAction = action.length > 0;
    const allGood = !hasAction && soon.length === 0;

    const renderItem = (item) => {
        const st = STATUS[item.status] || STATUS["due-soon"];
        return (
            <li key={item.key} className={`due-item ${st.cls}`}>
                <span className="due-item-icon">{item.icon}</span>
                <div className="due-item-body">
                    <div className="due-item-title">
                        <strong>{item.name}</strong>
                        <span className="due-item-kind">{item.kind}</span>
                        <span className={`due-status ${st.cls}`}>{st.label}</span>
                    </div>

                    <div className="due-detail-grid">
                        <div>
                            <span className="due-detail-label">Amount</span>
                            <span className="due-detail-value">{formatMoney(item.amount)}</span>
                        </div>
                        <div>
                            <span className="due-detail-label">Due date</span>
                            <span className="due-detail-value">{formatDate(item.dueDate)}</span>
                        </div>
                        <div>
                            <span className="due-detail-label">Source jar</span>
                            <span className="due-detail-value">{item.jarName || "Not selected"}</span>
                        </div>
                    </div>

                    {item.status === "auto-failed" ? (
                        <div className="due-item-text">Reason: {item.reason}</div>
                    ) : (
                        <div className="due-item-text">{item.message}</div>
                    )}
                    {item.status === "auto-failed" && item.canConfirmPayment && (
                        <div className="due-confirm-payment">
                            <label>
                                Would you like to use another source jar?
                                <select
                                    value={jarSelections[item.id] || ""}
                                    onChange={event => setJarSelections(selections => ({
                                        ...selections,
                                        [item.id]: event.target.value
                                    }))}>
                                    <option value="">Select another jar</option>
                                    {item.alternativeJars.map(jar => (
                                        <option key={jar.id} value={jar.id}>
                                            {jar.name} ({jar.remaining == null
                                                ? "No monthly budget"
                                                : `${formatMoney(jar.remaining)} available`})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                className="due-confirm-button"
                                disabled={confirmingId === item.id}
                                onClick={() => confirmPayment(item)}>
                                {confirmingId === item.id ? "Processing..." : "Confirm payment"}
                            </button>
                            <button
                                className="due-decline-button"
                                onClick={closeAndMarkRead}>
                                Not now
                            </button>
                            {confirmationErrors[item.id] && (
                                <div className="due-confirm-error" role="alert">
                                    {confirmationErrors[item.id]}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </li>
        );
    };

    const summary = [
        autoPaid.length > 0 && `${autoPaid.length} auto-paid`,
        action.length > 0 && `${action.length} need action`,
        soon.length > 0 && `${soon.length} due soon`
    ].filter(Boolean).join(" · ");

    return (
        <div className="due-overlay" onClick={closeAndMarkRead}>
            <div
                className="due-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Goal and debt notifications"
                onClick={e => e.stopPropagation()}
            >
                <div className={`due-header ${hasAction ? "has-overdue" : ""} ${allGood ? "all-good" : ""}`}>
                    <span className="due-header-icon">
                        {hasAction ? "⚠️" : allGood ? "✅" : "⚠️"}
                    </span>
                    <div>
                        <h3>Goal &amp; Debt notifications</h3>
                        <p>{summary}</p>
                    </div>
                </div>

                <div className="due-body">
                    {autoPaid.length > 0 && (
                        <section className="due-section">
                            <h4 className="due-section-title paid">
                                ✅ Auto-paid
                                <span className="due-count">{autoPaid.length}</span>
                            </h4>
                            <ul className="due-list">{autoPaid.map(renderItem)}</ul>
                        </section>
                    )}

                    {action.length > 0 && (
                        <section className="due-section">
                            <h4 className="due-section-title overdue">
                                ⚠️ Overdue / auto-pay failed
                                <span className="due-count">{action.length}</span>
                            </h4>
                            <ul className="due-list">{action.map(renderItem)}</ul>
                        </section>
                    )}

                    {soon.length > 0 && (
                        <section className="due-section">
                            <h4 className="due-section-title soon">
                                ⏰ Due soon
                                <span className="due-count">{soon.length}</span>
                            </h4>
                            <ul className="due-list">{soon.map(renderItem)}</ul>
                        </section>
                    )}
                </div>

                <div className="due-footer">
                    <button className="due-btn" onClick={closeAndMarkRead}>
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}