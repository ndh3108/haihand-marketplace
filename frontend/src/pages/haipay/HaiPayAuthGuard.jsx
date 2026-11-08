import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const HaiPayAuthGuard = ({ children }) => {
  const location = useLocation();

  const user = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const haipayToken = localStorage.getItem('haipay_token');

  // If neither wallet token nor marketplace user is logged in, redirect to HaiPay login
  if (!user && !haipayToken) {
    return <Navigate to="/haipay/login" state={{ from: location }} replace />;
  }

  return children;
};

export default HaiPayAuthGuard;
