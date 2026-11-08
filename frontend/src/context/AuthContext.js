import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored || stored === 'undefined') return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());

  // Re-fetch the latest user data from the API and update localStorage + state
  const refreshProfile = useCallback(async () => {
    const stored = getStoredUser();
    if (!stored?._id) {
      setUser(null);
      return;
    }
    try {
      const { data } = await axios.get(`${API_URL}/api/users/${stored._id}`);
      if (data) {
        const merged = { ...stored, ...data, token: data.token || stored.token };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
      }
    } catch {
      // Fallback: keep the stored user as-is
      setUser(stored);
    }
  }, []);

  // Sync state whenever another part of the app updates localStorage
  useEffect(() => {
    const handleUserUpdated = () => {
      setUser(getStoredUser());
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('userUpdated'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
