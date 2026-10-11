export const BASE_URL = "http://localhost:5084/api";

/**
 * fetch có sẵn header Authorization (token lấy từ localStorage "token").
 * Ví dụ: authFetch("/Goals"), authFetch("/Goals", { method: "POST", body: JSON.stringify(data) })
 */
export function authFetch(path, options = {}) {
    const token = localStorage.getItem("token");
    const headers = { ...(options.headers || {}) };

    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export function notifyDueAlertRefresh(kind, entityId) {
    window.dispatchEvent(new CustomEvent("due-alerts-refresh", {
        detail: { kind, entityId }
    }));
}

/** Đọc JSON an toàn: trả null nếu response không có body / không phải JSON. */
export async function readJson(res) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

/** Lấy thông báo lỗi từ response của API (message tự viết hoặc ProblemDetails mặc định). */
export function errorMessage(data, fallback) {
    return data?.message || data?.title || fallback;
}

export const formatMoney = (amount) =>
    amount === null || amount === undefined
        ? "—"
        : Number(amount).toLocaleString("vi-VN") + " ₫";