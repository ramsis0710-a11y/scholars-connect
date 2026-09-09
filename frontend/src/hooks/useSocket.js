import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { getToken } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated) {
      const connectSocket = async () => {
        const token = await getToken();
        socketInstance = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket']
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        setSocket(socketInstance);
      };

      connectSocket();
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated]);

  const joinQuestionRoom = (questionId) => {
    socket?.emit('join:question', questionId);
  };

  const leaveQuestionRoom = (questionId) => {
    socket?.emit('leave:question', questionId);
  };

  const onNewMessage = (callback) => {
    socket?.on('message:new', callback);
  };

  const offNewMessage = (callback) => {
    socket?.off('message:new', callback);
  };

  return {
    socket,
    isConnected,
    joinQuestionRoom,
    leaveQuestionRoom,
    onNewMessage,
    offNewMessage
  };
};
