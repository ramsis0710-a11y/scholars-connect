import api from './client';

export const getMessages = async (questionId) => {
  const response = await api.get(`/chat/questions/${questionId}/messages`);
  return response.data.data;
};

export const sendMessage = async (questionId, content) => {
  const response = await api.post(`/chat/questions/${questionId}/messages`, { content });
  return response.data.data;
};

export const markAsRead = async (messageId) => {
  const response = await api.put(`/chat/messages/${messageId}/read`);
  return response.data.data;
};
