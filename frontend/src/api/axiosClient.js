import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const axiosClient = axios.create({
  baseURL: API_URL
});

axiosClient.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('user');
    if (stored && stored !== 'undefined') {
      const user = JSON.parse(stored);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
      if (user?._id) {
        config.headers.userid = user._id;
      }
    }
  } catch (e) { }
  return config;
});

export const persistUser = (user) => {
  if (!user) {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userUpdated'));
    return;
  }
  const prev = (() => {
    try {
      const s = localStorage.getItem('user');
      return s && s !== 'undefined' ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  })();
  const next = { ...prev, ...user };
  if (user.token) next.token = user.token;
  else if (prev.token) next.token = prev.token;
  localStorage.setItem('user', JSON.stringify(next));
  window.dispatchEvent(new Event('userUpdated'));
  return next;
};

export const getSellerEntryPath = (user) => {
  if (!user) return '/login';
  if (user.isSeller === true && user.sellerStatus === 'approved') return '/seller-channel';
  return '/register-seller';
};

export default axiosClient;
