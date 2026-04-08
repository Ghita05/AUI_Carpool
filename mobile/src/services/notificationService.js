import api from './api';

export const getNotifications = async (page = 1, limit = 30) => {
  const { data } = await api.get('/notifications', { params: { page, limit } });
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data;
};

export const markAsRead = async (notificationId) => {
  const { data } = await api.put(`/notifications/${notificationId}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await api.put('/notifications/mark-all-read');
  return data;
};
