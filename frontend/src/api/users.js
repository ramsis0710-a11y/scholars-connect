import api from './client';

export const getMe = async () => {
  const response = await api.get('/users/me');
  return response.data.data;
};

export const updateMe = async (data) => {
  const response = await api.put('/users/me', data);
  return response.data.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/users/me/change-password', {
    currentPassword,
    newPassword
  });
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/users/me/notifications');
  return response.data.data;
};

export const getPublicUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data.data;
};
