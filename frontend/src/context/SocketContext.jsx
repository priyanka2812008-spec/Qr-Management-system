import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

    // If on HTTPS and no custom secure socket URL is configured, switch directly to demo mode
    if (isBrowserHttps && !rawSocketUrl) {
      console.info("[Hacker's Unity] Running on HTTPS without live socket URL - running in Demo Preview mode.");
      setIsDemoMode(true);
      return;
    }

    const SOCKET_URL = rawSocketUrl || 'http://localhost:5000';
    let s = null;

    try {
      s = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 2500
      });

      s.on('connect', () => {
        console.log("Connected to Hacker's Unity live sync socket");
        setIsConnected(true);
        setIsDemoMode(false);
      });

      s.on('disconnect', () => {
        setIsConnected(false);
      });

      s.on('connect_error', () => {
        setIsConnected(false);
        setIsDemoMode(true);
      });

      setSocket(s);
    } catch {
      setIsDemoMode(true);
    }

    // Safety timeout: If not connected within 3s, set demo mode
    const timer = setTimeout(() => {
      if (!isConnected) {
        setIsDemoMode(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (s) s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isDemoMode }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
