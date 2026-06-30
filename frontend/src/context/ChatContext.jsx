import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';

const ChatContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const SOCKET_SERVER_URL = BACKEND_URL;

export const ChatProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Load user from localStorage on initialization
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  // Handle Socket.IO connection and global socket event listeners
  useEffect(() => {
    if (!user) {
      // Disconnect socket if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to Socket.IO server, passing the JWT token in auth parameters
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        token: user.token,
      },
    });

    setSocket(newSocket);

    // Join personal setup room
    newSocket.on('connect', () => {
      newSocket.emit('setup');
      console.log('Connected to WebSocket server');
    });

    // Handle online status events from other users
    newSocket.on('user online', (userId) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    newSocket.on('user offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Handle manual logout
  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    setSelectedChat(null);
    setChats([]);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        socket,
        setSocket,
        onlineUsers,
        setOnlineUsers,
        logout,
        apiUrl: `${BACKEND_URL}/api`,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  return useContext(ChatContext);
};
