
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../api/notificationApi';
import './notification.css';

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

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await notificationApi.getAll();
            setItems(response.data || []);
        } catch (err) {
            setError('Unable to load notifications.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCount();
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
                                        <strong>{item.title}</strong>
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
