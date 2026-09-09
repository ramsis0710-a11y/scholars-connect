import { useState, useEffect, useCallback } from 'react';
import { getMyQuestions, createQuestion as apiCreateQuestion } from '../api/questions';

export const useQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const loadQuestions = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyQuestions({ page, ...params });
      setQuestions(response.data);
      setTotalPages(response.totalPages);
      setTotalQuestions(response.count);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const createQuestion = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const newQuestion = await apiCreateQuestion(data);
      await loadQuestions();
      return newQuestion;
    } catch (err) {
      setError(err.message || 'Failed to create question');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    questions,
    loading,
    error,
    page,
    totalPages,
    totalQuestions,
    setPage,
    loadQuestions,
    createQuestion
  };
};
