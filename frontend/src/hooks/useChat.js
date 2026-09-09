import { useState, useEffect, useCallback } from 'react';
import { getMessages, sendMessage as apiSendMessage } from '../api/chat';

export const useChat = (questionId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!questionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMessages(questionId);
      setMessages(data);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = async (content) => {
    setSending(true);
    setError(null);
    try {
      const message = await apiSendMessage(questionId, content);
      setMessages(prev => [...prev, message]);
      return message;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const setMessagesFromSocket = (messages) => {
    setMessages(messages);
  };

  return {
    messages,
    loading,
    error,
    sending,
    loadMessages,
    sendMessage,
    addMessage,
    setMessagesFromSocket
  };
};
