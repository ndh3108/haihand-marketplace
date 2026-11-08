import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null });
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { userId: user._id },
      query: { userId: user._id }
    });

    const handleConnect = () => {
      newSocket.emit('addUser', user._id);
    };

    newSocket.on('connect', handleConnect);
    if (newSocket.connected) {
      handleConnect();
    }

    setSocket(newSocket);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext) || { socket: null };
};

export default SocketContext;
