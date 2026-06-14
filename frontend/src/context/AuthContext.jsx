import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', {
      identifier: email,
      password,
    });
    if (data.success) {
      const userData = { ...data.user, token: data.token };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return data;
    }
    throw new Error('Login failed');
  };

  const register = async ({ fullName, email, password, role, phone }) => {
    const { data } = await api.post('/auth/register', {
      email,
      phone: phone || '0000000000',
      password,
    });
    if (data.success) {
      const userData = { ...data.user, token: data.token };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return data;
    }
    throw new Error('Registration failed');
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    profile: user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
