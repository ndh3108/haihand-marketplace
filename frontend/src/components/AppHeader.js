import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

// Helper to format relative time in Vietnamese
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Icon helper by notification type
function getNotifIcon(type) {
  switch (type) {
    case 'ORDER':
    case 'NEW_ORDER':
    case 'ORDER_STATUS':
      return { icon: '📦', bg: 'bg-amber-100 text-amber-700' };
    case 'PAYMENT':
      return { icon: '💳', bg: 'bg-emerald-100 text-emerald-700' };
    case 'MESSAGE':
      return { icon: '💬', bg: 'bg-blue-100 text-blue-700' };
    case 'PRODUCT':
      return { icon: '🏷️', bg: 'bg-purple-100 text-purple-700' };
    case 'SELLER':
      return { icon: '🏪', bg: 'bg-orange-100 text-orange-700' };
    default:
      return { icon: '🔔', bg: 'bg-stone-100 text-stone-700' };
  }
}

export const AppHeader = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { socket } = useSocket();
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const fetchCartCount = useCallback(async () => {
    if (user?._id) {
      try {
        const { data } = await axios.get(`${API_URL}/api/users/cart/${user._id}`);
        setCartCount(data.length);
      } catch (err) {
        console.error("Lỗi lấy số lượng giỏ hàng:", err);
      }
    } else {
      setCartCount(0);
    }
  }, [API_URL, user?._id]);

  const fetchUnreadCount = useCallback(async () => {
    if (user?._id) {
      try {
        const { data } = await axios.get(`${API_URL}/api/messages/unread-count/${user._id}`);
        setUnreadCount(data.count || 0);
      } catch (err) {
        console.error("Lỗi lấy số lượng tin nhắn chưa đọc:", err);
      }
    } else {
      setUnreadCount(0);
    }
  }, [API_URL, user?._id]);

  const fetchNotifications = useCallback(async () => {
    if (user?._id) {
      try {
        const { data } = await axios.get(`${API_URL}/api/notifications?role=buyer`, {
          headers: { userid: user._id }
        });
        setNotifications(data.notifications || []);
        setNotifCount(data.unreadCount || 0);
      } catch (err) {
        console.error("Lỗi lấy thông báo:", err);
      }
    } else {
      setNotifications([]);
      setNotifCount(0);
    }
  }, [API_URL, user?._id]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    fetchCartCount();
    fetchUnreadCount();
    fetchNotifications();
    window.addEventListener('cartUpdated', fetchCartCount);
    window.addEventListener('userUpdated', fetchCartCount);
    window.addEventListener('messageUpdated', fetchUnreadCount);
    return () => {
      window.removeEventListener('cartUpdated', fetchCartCount);
      window.removeEventListener('userUpdated', fetchCartCount);
      window.removeEventListener('messageUpdated', fetchUnreadCount);
    };
  }, [fetchCartCount, fetchUnreadCount, fetchNotifications]);

  // Socket.IO real-time notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (newNotif) => {
      const isTarget = !newNotif.userId || newNotif.userId === user?._id || newNotif.user === user?._id;
      if (isTarget) {
        setNotifications(prev => [newNotif, ...prev.filter(n => n._id !== newNotif._id)]);
        setNotifCount(prev => prev + 1);
      }
    };

    socket.on('new_notification', handleNewNotif);
    return () => {
      socket.off('new_notification', handleNewNotif);
    };
  }, [socket, user?._id]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNotifOpen]);

  const handleNotifClick = async (notif) => {
    setIsNotifOpen(false);
    if (!notif.isRead) {
      try {
        await axios.put(`${API_URL}/api/notifications/${notif._id}/read`, {}, {
          headers: { userid: user._id }
        });
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setNotifCount(prev => Math.max(0, prev - 1));
      } catch (e) {}
    }
    const target = notif.targetUrl || notif.link || '/';
    if (target && target !== '#') {
      navigate(target);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`, { role: 'buyer' }, {
        headers: { userid: user._id }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setNotifCount(0);
    } catch (e) {
      console.error("Lỗi đánh dấu đã đọc:", e);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(keyword);
    }
  };

  const handleSellerChannelClick = () => {
    if (user?.isSeller === true && user?.sellerStatus === 'approved') {
      window.open('/seller-channel', '_blank');
    } else {
      window.open('/register-seller', '_blank');
    }
  };

  const isApprovedSeller = user?.isSeller === true && user?.sellerStatus === 'approved';
  const isPendingSeller = user?.sellerStatus === 'pending';

  return (
    <header className="sticky top-0 z-50 bg-[#FACC15] shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="HaiHand" className="h-10 w-auto object-contain" />
        </Link>
        
        <div className="flex-1 max-w-2xl mx-8 hidden md:block">
          <form className="relative" onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm đồ cũ, điện tử, thời trang..." 
              className="w-full h-10 pl-4 pr-12 rounded-lg bg-white border border-transparent focus:border-[#EAB308] focus:outline-none text-sm"
            />
            <button type="submit" aria-label="Tìm kiếm" className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center bg-[#1C1917] text-white rounded-md hover:bg-stone-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#1C1917]">
            <Link to="/" className="hover:underline">Trang chủ</Link>
            <Link to="/products" className="hover:underline">Khám phá</Link>
            {user && (
              <Link to="/chat" className="relative hover:underline">
                Tin nhắn
                {unreadCount > 0 && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full border border-[#FACC15]"></span>}
              </Link>
            )}
          </nav>
          
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link to="/haipay/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 mr-1 rounded-full bg-white/50 hover:bg-white transition-colors font-bold text-sm text-[#1C1917] border border-stone-200/50 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  Ví HaiPay
                </Link>

                {/* Real-Time Notification Bell & Dropdown */}
                <div className="relative" ref={notifDropdownRef}>
                  <button 
                    onClick={() => setIsNotifOpen(prev => !prev)}
                    aria-label="Thông báo" 
                    className={`p-2 relative rounded-full transition-all duration-150 ${isNotifOpen ? 'bg-black/10' : 'hover:bg-black/5'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1C1917]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-sm ring-2 ring-[#FACC15] animate-pulse">
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Box */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-150">
                      {/* Header */}
                      <div className="p-3.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-stone-900">Thông báo</span>
                          {notifCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                              {notifCount} mới
                            </span>
                          )}
                        </div>
                        {notifCount > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition-colors bg-transparent border-0 cursor-pointer p-0"
                          >
                            Đã đọc tất cả
                          </button>
                        )}
                      </div>

                      {/* Notification Items List */}
                      <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100">
                        {notifications.length === 0 ? (
                          <div className="py-10 px-4 text-center text-stone-400">
                            <span className="text-3xl block mb-2 opacity-60">📭</span>
                            <p className="text-xs font-semibold">Chưa có thông báo nào</p>
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const { icon, bg } = getNotifIcon(n.type);
                            return (
                              <div
                                key={n._id}
                                onClick={() => handleNotifClick(n)}
                                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                                  !n.isRead 
                                    ? 'bg-amber-50/60 hover:bg-amber-100/50' 
                                    : 'bg-white hover:bg-stone-50'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-base ${bg}`}>
                                  {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h4 className={`text-xs truncate leading-tight ${!n.isRead ? 'font-black text-stone-900' : 'font-semibold text-stone-700'}`}>
                                      {n.title}
                                    </h4>
                                    {!n.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed mb-1">
                                    {n.message}
                                  </p>
                                  <span className="text-[10px] text-stone-400 font-mono block">
                                    {formatTime(n.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center">
                        <button
                          onClick={() => {
                            setIsNotifOpen(false);
                            navigate('/profile?tab=orders_buy');
                          }}
                          className="text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors w-full py-1"
                        >
                          Xem tất cả đơn mua →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => navigate('/cart')} aria-label="Giỏ hàng" className="p-2 relative hover:bg-black/5 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1C1917]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {cartCount > 0 && <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border border-[#FACC15]">{cartCount}</span>}
                </button>
                <Link to="/profile" className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-black/10 hover:opacity-80 transition-opacity">
                  <img src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}/${user.avatar.replace(/\\/g, '/')}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt={user.name} className="w-8 h-8 rounded-full border border-white object-cover" />
                  <span className="text-sm font-semibold text-[#1C1917]">{user.name}</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-2 border-l border-black/10 pl-2">
                <Link to="/login" className="text-sm font-semibold text-[#1C1917] hover:underline">Đăng nhập</Link>
                <span className="text-black/20">|</span>
                <Link to="/register" className="text-sm font-semibold text-[#1C1917] hover:underline">Đăng ký</Link>
              </div>
            )}
          </div>
          
          <a 
            href={isApprovedSeller ? "/seller-channel" : "/register-seller"} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleSellerChannelClick();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 ml-1 py-1.5 px-3 rounded-lg bg-[#1C1917] hover:bg-stone-800 text-white text-xs font-bold transition-colors shadow-xs text-decoration-none cursor-pointer"
          >
            {isApprovedSeller ? (
              <>
                <i className="fas fa-store text-orange-400"></i>
                Kênh Người Bán
              </>
            ) : isPendingSeller ? (
              <>
                <i className="fas fa-clock text-amber-400"></i>
                Shop Chờ Duyệt
              </>
            ) : (
              <>
                <i className="fas fa-store-alt text-amber-300"></i>
                Kênh Người Bán
              </>
            )}
          </a>
        </div>
      </div>
    </header>
  );
};
