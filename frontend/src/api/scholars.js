import api from './client';

export const getAllScholars = async (params = {}) => {
  const response = await api.get('/scholars', { params });
  return response.data;
};

export const getScholarById = async (id) => {
  const response = await api.get(`/scholars/${id}`);
  return response.data.data;
};

export const createScholarProfile = async (data) => {
  const response = await api.post('/scholars', data);
  return response.data.data;
};

export const updateScholarProfile = async (data) => {
  const response = await api.put('/scholars/me', data);
  return response.data.data;
};

export const updateAvailability = async (isAvailable) => {
  const response = await api.put('/scholars/me/availability', { isAvailable });
  return response.data.data;
};
