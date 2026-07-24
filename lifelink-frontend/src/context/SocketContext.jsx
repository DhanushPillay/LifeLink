import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const esRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);

  const dispatch = useCallback((event, data) => {
    const handlers = listenersRef.current.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(data); } catch (e) { console.error('Handler error', e); }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || !user) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    // Get fresh token from localStorage for reconnection
    const freshToken = localStorage.getItem('lifelink_token');
    if (!freshToken) return;

    const serverUrl =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:5000'
        : 'https://blood-and-organ-donar-matching-system.onrender.com');

    const url = `${serverUrl}/api/stream?token=${encodeURIComponent(freshToken)}`;
    // SECURITY: Don't log the full URL as it contains the token
    console.log('[SSE] Connecting to server');

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connect', () => {
      console.log('[SSE] Connected');
      setConnected(true);
      retryCountRef.current = 0;
    });

    es.addEventListener('online-users', (e) => {
      try { setOnlineUsers(JSON.parse(e.data)); } catch {}
    });

    const forwardEvents = [
      'new-notification', 'new-request',
      'receive-message', 'message-sent', 'chat-error',
      'user-typing', 'user-stop-typing', 'messages-read',
    ];
    forwardEvents.forEach((evt) => {
      es.addEventListener(evt, (e) => {
        try { dispatch(evt, JSON.parse(e.data)); } catch {}
      });
    });

    es.onerror = () => {
      console.log('[SSE] Error / disconnected');
      setConnected(false);
      es.close();
      esRef.current = null;

      // Exponential back-off: 2s, 4s, 8s, … max 30s
      const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${retryCountRef.current})`);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [token, user, dispatch]);

  useEffect(() => {
    if (!token || !user) {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      clearTimeout(reconnectTimerRef.current);
      setConnected(false);
      setOnlineUsers([]);
      retryCountRef.current = 0;
      return;
    }
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      setConnected(false);
    };
  }, [token, user, connect]);

  // socket shim – same API as before so Chat.jsx doesn't need changes
  const socket = useRef({
    _handlers: new Map(),
    on(event, handler) {
      if (!this._handlers.has(event)) this._handlers.set(event, new Set());
      this._handlers.get(event).add(handler);
      listenersRef.current = this._handlers;
    },
    off(event, handler) {
      const set = this._handlers.get(event);
      if (set) set.delete(handler);
      listenersRef.current = this._handlers;
    },
    emit(event, data) {
      if (event === 'send-message') {
        api.post(`/chat/${data.receiverId}/send`, { text: data.text }).catch(() => {});
      } else if (event === 'typing') {
        api.post(`/chat/${data.receiverId}/typing`).catch(() => {});
      } else if (event === 'stop-typing') {
        api.post(`/chat/${data.receiverId}/stop-typing`).catch(() => {});
      } else if (event === 'mark-read') {
        api.post(`/chat/${data.userId}/read`).catch(() => {});
      }
    },
    disconnect() {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    },
  }).current;

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
