
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../api/notificationApi';
import api from '../../api/api';
import './notification.css';

const DISPLAY_TITLES = {
    'Auto-pay failed: G:3': 'Auto-payment Failed — Insufficient Funds',
    'Auto-pay failed: D:2': 'Auto-payment Failed — No Payment Source',
    'DueAlert:DEBT_DUE:2': 'Debt Payment Due Soon',
    'DueAlert:GOAL_DUE:3': 'Financial Goal Deadline Reminder'
};

const getDisplayTitle = (title, status) => {
    if (title.startsWith('Auto-pay failed: G:')) return 'Auto-payment Failed — Insufficient Funds';
    if (title.startsWith('Auto-pay failed: D:')) return 'Auto-payment Failed — No Payment Source';
    const dueMatch = title.match(/^DueAlert:(DEBT_DUE|GOAL_DUE):/);
    if (dueMatch) {
        const type = dueMatch[1];
        if (status === 'overdue') {
            return type === 'DEBT_DUE' ? 'Debt Payment Overdue' : 'Financial Goal Overdue';
        }
        return type === 'DEBT_DUE' ? 'Debt Payment Due Soon' : 'Financial Goal Deadline Reminder';
    }
    return title;
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const containerRef = useRef(null);

    const loadCount = useCallback(async () => {
        try {
            const response = await notificationApi.getUnreadCount();
            setUnreadCount(response.data.count || 0);
        } catch (err) {
            console.error('Cannot load notification count:', err);
        }
    }, []);

    const [dueStatusMap, setDueStatusMap] = useState({});

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await notificationApi.getAll();
            setItems(response.data || []);
            try {
                const dueRes = await api.get('/DueAlerts');
                const map = {};
                (dueRes.data || []).forEach(item => {
                    const type = item.kind === 'Debt' ? 'DEBT_DUE' : 'GOAL_DUE';
                    map[`${type}:${item.entityId}`] = item.status;
                });
                setDueStatusMap(map);
            } catch (e) {
                // ignore
            }
        } catch (err) {
            setError('Unable to load notifications.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCount();

        const interval = setInterval(loadCount, 30000);

        return () => clearInterval(interval);
    }, [loadCount]);

    useEffect(() => {
        if (open) {
            loadNotifications();
            loadCount();
        }
    }, [open, loadNotifications, loadCount]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const markAsRead = async (id) => {
        try {
            await notificationApi.markAsRead(id);

            setItems(previous =>
                previous.map(item =>
                    item.id === id ? { ...item, isRead: true } : item
                )
            );

            await loadCount();
        } catch (err) {
            setError('Unable to mark notification as read.');
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setItems(previous =>
                previous.map(item => ({ ...item, isRead: true }))
            );
            setUnreadCount(0);
        } catch (err) {
            setError('Unable to mark all notifications as read.');
        }
    };

    const formatDate = (value) => {
        if (!value) return '';
        return new Date(value).toLocaleString('vi-VN');
    };

    return (
        <div className="notification-wrapper" ref={containerRef}>
            <button
                type="button"
                className="notification-trigger"
                onClick={() => setOpen(value => !value)}
                aria-label="Notifications"
                aria-expanded={open}
                title="Notifications"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                </svg>

                {unreadCount > 0 && (
                    <span className="notification-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="notification-panel">
                    <div className="notification-panel-header">
                        <strong>Notifications</strong>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="notification-read-all"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {error && (
                        <p className="notification-error">{error}</p>
                    )}

                    <div className="notification-list">
                        {loading ? (
                            <p className="notification-empty">Loading...</p>
                        ) : items.length === 0 ? (
                            <p className="notification-empty">
                                No notifications yet.
                            </p>
                        ) : (
                            items.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`notification-item ${
                                        item.isRead ? '' : 'unread'
                                    }`}
                                    onClick={() => {
                                        if (!item.isRead) markAsRead(item.id);
                                    }}
                                >
                                    <span className="notification-item-content">
                                        <strong>{getDisplayTitle(item.title, dueStatusMap[item.title.replace('DueAlert:', '')])}</strong>
                                        <span>{item.message}</span>
                                        <small>{formatDate(item.createdAt)}</small>
                                    </span>

                                    {!item.isRead && (
                                        <span className="notification-unread-dot" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
