import api from './client';

export const createQuestion = async (data) => {
  const response = await api.post('/questions', data);
  return response.data.data;
};

export const getMyQuestions = async (params = {}) => {
  const response = await api.get('/questions/mine', { params });
  return response.data;
};

export const getQuestionById = async (id) => {
  const response = await api.get(`/questions/${id}`);
  return response.data.data;
};

export const updateQuestion = async (id, data) => {
  const response = await api.put(`/questions/${id}`, data);
  return response.data.data;
};

export const deleteQuestion = async (id) => {
  const response = await api.delete(`/questions/${id}`);
  return response.data;
};

export const addResponse = async (id, data) => {
  const response = await api.post(`/questions/${id}/responses`, data);
  return response.data.data;
};
