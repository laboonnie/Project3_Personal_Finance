import api from './api';

export const notificationApi = {
    getAll: () => api.get('/Notifications'),

    getUnreadCount: () =>
        api.get('/Notifications/unread-count'),

    markAsRead: (id) =>
        api.put(`/Notifications/${id}/read`),

    markAllAsRead: () =>
        api.put('/Notifications/read-all')
};
