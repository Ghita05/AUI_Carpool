import api from './api';

export const sendMessage = async ({ receiverId, rideId, content }) => {
  const { data } = await api.post('/messages', { receiverId, rideId, content });
  return data;
};

export const getConversations = async () => {
  const { data } = await api.get('/messages/conversations');
  return data;
};

export const getMessageHistory = async (otherUserId) => {
  const { data } = await api.get(`/messages/${otherUserId}`);
  return data;
};

export const searchMessages = async (query) => {
  const { data } = await api.get('/messages/search', { params: { query } });
  return data;
};

export const deleteConversation = async (otherUserId) => {
  const { data } = await api.delete(`/messages/conversation/${otherUserId}`);
  return data;
};

export const getChannels = async () => {
  const { data } = await api.get('/messages/channels');
  return data;
};

export const getChannelMessages = async (rideId) => {
  const { data } = await api.get(`/messages/channels/${rideId}`);
  return data;
};

export const sendChannelMessage = async (rideId, content) => {
  const { data } = await api.post(`/messages/channels/${rideId}`, { content });
  return data;
};
