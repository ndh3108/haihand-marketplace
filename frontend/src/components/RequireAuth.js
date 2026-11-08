import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

/**
 * RequireAuth - Wrapper component that protects routes requiring login.
 * Shows a toast notification and redirects to /login if user is not logged in.
 */
const RequireAuth = ({ children }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const user = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== "undefined" ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!user) {
      toast.warning('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để sử dụng chức năng này!');
      navigate('/login', { replace: true });
    }
  }, [user, navigate, toast]);

  if (!user) return null;

  return children;
};

export default RequireAuth;
