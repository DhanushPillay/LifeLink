import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { fetchCsrfToken } from '../api/axios';
import { requestFCMPermission, onForegroundMessage } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [callLogs, setCallLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);

  // Check authentication on mount by calling /auth/me
  useEffect(() => {
    const initAuth = async () => {
      await fetchCsrfToken();
      
      const checkAuth = async () => {
        try {
          const { data } = await api.get('/auth/me');
          const userData = data.user || data;
          setUser(userData);
          
          // Use localStorage token if available, else fallback
          const localToken = localStorage.getItem('lifelink_token');
          setToken(localToken || 'cookie-auth');
          
          setBlockedIds(userData.blockedIds || []);

          const [notifsRes, callsRes] = await Promise.all([
            api.get('/notifications').catch(() => ({ data: [] })),
            api.get('/calls').catch(() => ({ data: [] })),
          ]);
          setNotifications(notifsRes.data || []);
          setCallLogs(callsRes.data || []);
        } catch (err) {
          setUser(null);
          setToken(null);
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    };
    initAuth();
  }, []);

  // ── FCM: Initialize on login ───────────────────────
  useEffect(() => {
    if (!user || !token) return;

    const saveToken = async (fcmToken) => {
      try {
        await api.post('/auth/fcm-token', { token: fcmToken });
      } catch (err) {
        console.warn('Failed to save FCM token:', err);
      }
    };

    requestFCMPermission(saveToken);

    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        addNotification({
          title,
          message: body || '',
          type: 'info',
          redirect: payload.data?.redirect || '/dashboard',
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user, token]);

  // ── Auth: Sign Up ──────────────────────────────────
  const signUp = useCallback(async ({ email, phone, password }) => {
    try {
      const { data } = await api.post('/auth/register', { email, phone, password });
      const userData = data.user || data;
      setUser(userData);
      setToken(data.token);
      if (data.token) localStorage.setItem('lifelink_token', data.token);
      setBlockedIds(userData.blockedIds || []);
      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Auth: Login ────────────────────────────────────
  const login = useCallback(async ({ identifier, password }) => {
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      const userData = data.user || data;
      setUser(userData);
      setToken(data.token);
      if (data.token) localStorage.setItem('lifelink_token', data.token);
      setBlockedIds(userData.blockedIds || []);

      const [notifsRes, callsRes] = await Promise.all([
        api.get('/notifications').catch(() => ({ data: [] })),
        api.get('/calls').catch(() => ({ data: [] })),
      ]);
      setNotifications(notifsRes.data || []);
      setCallLogs(callsRes.data || []);

      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Auth: Logout ───────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lifelink_token');
    setCallLogs([]);
    setNotifications([]);
    setBlockedIds([]);
    // Clear httpOnly cookie via API call
    api.post('/auth/logout').catch(() => {});
  }, []);

  // ── Auth: Reset Password ───────────────────────────
  const resetPassword = useCallback(async ({ identifier, newPassword }) => {
    try {
      await api.post('/auth/reset-password', { identifier, newPassword });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Auth: Google Login ────────────────────────────
  const googleLogin = useCallback(async (credentialResponse) => {
    try {
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });
      const userData = data.user || data;
      setUser(userData);
      setToken(data.token);
      if (data.token) localStorage.setItem('lifelink_token', data.token);
      setBlockedIds(userData.blockedIds || []);

      const [notifsRes, callsRes] = await Promise.all([
        api.get('/notifications').catch(() => ({ data: [] })),
        api.get('/calls').catch(() => ({ data: [] })),
      ]);
      setNotifications(notifsRes.data || []);
      setCallLogs(callsRes.data || []);

      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Profile: Complete Profile ──────────────────────
  const completeProfile = useCallback(async (profileData) => {
    try {
      const { data } = await api.put('/auth/profile', profileData);
      setUser(data.user || data);
      return { success: true };
    } catch (err) {
      console.error('Failed to complete profile:', err);
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Profile: Update Profile ────────────────────────
  const updateProfile = useCallback(async (profileData) => {
    try {
      const { data } = await api.put('/auth/profile', profileData);
      setUser(data.user || data);
      return { success: true };
    } catch (err) {
      console.error('Failed to update profile:', err);
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, []);

  // ── Account: Delete Account ────────────────────────
  const deleteAccount = useCallback(async ({ password }) => {
    try {
      await api.post('/auth/delete', { password });
      logout();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }, [logout]);

  // ── Call Logs (backend API) ────────────────────────
  const addCallLog = useCallback(async (call) => {
    try {
      const { data } = await api.post('/calls', call);
      setCallLogs((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Failed to add call log:', err);
      return null;
    }
  }, []);

  const deleteCallLog = useCallback(async (id) => {
    try {
      await api.delete(`/calls/${id}`);
      setCallLogs((prev) => prev.filter((c) => c._id !== id && c.id !== id));
    } catch (err) {
      console.error('Failed to delete call log:', err);
    }
  }, []);

  // ── Blocked Donors (backend API) ───────────────────
  const blockDonor = useCallback(async (donorId) => {
    try {
      const { data } = await api.post(`/auth/block/${donorId}`);
      setBlockedIds(data.blockedIds || [...blockedIds, donorId]);
    } catch (err) {
      console.error('Failed to block donor:', err);
    }
  }, [blockedIds]);

  const unblockDonor = useCallback(async (donorId) => {
    try {
      const { data } = await api.post(`/auth/unblock/${donorId}`);
      setBlockedIds(data.blockedIds || blockedIds.filter((id) => id !== donorId));
    } catch (err) {
      console.error('Failed to unblock donor:', err);
    }
  }, [blockedIds]);

  // ── Notifications (backend API) ────────────────────
  const addNotification = useCallback(async (notif) => {
    // Check for duplicate by _id if provided
    if (notif._id) {
      setNotifications((prev) => {
        if (prev.some(n => n._id === notif._id)) return prev;
        return [{ ...notif, read: false, createdAt: notif.createdAt || new Date().toISOString() }, ...prev];
      });
    } else {
      // For notifications without _id (local only)
      const entry = {
        _id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        createdAt: new Date().toISOString(),
        ...notif,
      };
      setNotifications((prev) => [entry, ...prev]);
    }
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        profileComplete: user?.profileComplete ?? false,
        signUp,
        login,
        logout,
        resetPassword,
        googleLogin,
        completeProfile,
        updateProfile,
        deleteAccount,
        callLogs,
        addCallLog,
        deleteCallLog,
        blockedIds,
        blockDonor,
        unblockDonor,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}