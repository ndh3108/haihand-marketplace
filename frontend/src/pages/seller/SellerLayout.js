import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
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

// Icon helper by seller notification type
function getSellerNotifIcon(type) {
    switch (type) {
        case 'NEW_ORDER':
        case 'ORDER':
            return { icon: '📦', bg: 'bg-emerald-100 text-emerald-700' };
        case 'PRODUCT':
            return { icon: '🏷️', bg: 'bg-purple-100 text-purple-700' };
        case 'PAYMENT':
            return { icon: '💳', bg: 'bg-amber-100 text-amber-700' };
        case 'SELLER':
            return { icon: '🏪', bg: 'bg-orange-100 text-orange-700' };
        case 'RETURN_REFUND':
            return { icon: '↩️', bg: 'bg-rose-100 text-rose-700' };
        default:
            return { icon: '🔔', bg: 'bg-slate-100 text-slate-700' };
    }
}

const SellerLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Notification state for Seller Hub
    const [notifications, setNotifications] = useState([]);
    const [notifCount, setNotifCount] = useState(0);
    const [unreadByType, setUnreadByType] = useState({});
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifDropdownRef = useRef(null);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    const shop = useMemo(() => {
        return user?.shopInfo || {};
    }, [user]);

    const navItems = [
        { path: '/seller-channel', icon: 'fas fa-chart-pie', label: 'Tổng quan Shop', end: true },
        { path: '/seller-channel/products', icon: 'fas fa-box-open', label: 'Quản lý sản phẩm', typeKey: 'PRODUCT' },
        { path: '/seller-channel/products/create', icon: 'fas fa-plus-circle', label: 'Đăng sản phẩm' },
        { path: '/seller-channel/orders', icon: 'fas fa-shipping-fast', label: 'Quản lý đơn hàng', typeKey: 'NEW_ORDER' },
        { path: '/seller-channel/settings', icon: 'fas fa-store-alt', label: 'Hồ sơ & Cài đặt Shop' },
    ];

    // Fetch seller notifications and unread breakdown
    const fetchSellerNotifications = useCallback(async () => {
        if (!user?._id) return;
        try {
            const { data } = await axios.get(`${API_URL}/api/notifications?role=seller`, {
                headers: { userid: user._id }
            });
            setNotifications(data.notifications || []);
            setNotifCount(data.unreadCount || 0);
            setUnreadByType(data.unreadByType || {});
        } catch (err) {
            console.error('Lỗi tải thông báo Kênh Người Bán:', err);
        }
    }, [API_URL, user?._id]);

    useEffect(() => {
        fetchSellerNotifications();
    }, [fetchSellerNotifications]);

    // Socket.IO real-time listener for incoming seller notifications
    useEffect(() => {
        if (!socket) return;

        const handleNewNotif = (newNotif) => {
            const isTarget = !newNotif.userId || newNotif.userId === user?._id || newNotif.shopId === user?._id || newNotif.user === user?._id;
            const isSellerContext = newNotif.recipientRole === 'seller' || newNotif.type === 'NEW_ORDER' || newNotif.type === 'SELLER';
            
            if (isTarget && isSellerContext) {
                setNotifications(prev => [newNotif, ...prev.filter(n => n._id !== newNotif._id)]);
                setNotifCount(prev => prev + 1);
                if (newNotif.type) {
                    setUnreadByType(prev => ({
                        ...prev,
                        [newNotif.type]: (prev[newNotif.type] || 0) + 1
                    }));
                }
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

    // Clear specific type badge (e.g. clicking "Quản lý đơn hàng" clears NEW_ORDER count)
    const clearTypeBadge = useCallback(async (typeKey) => {
        if (!typeKey || !user?._id || !unreadByType[typeKey]) return;
        const clearedAmount = unreadByType[typeKey] || 0;
        
        // Optimistic UI update
        setUnreadByType(prev => ({ ...prev, [typeKey]: 0 }));
        setNotifCount(prev => Math.max(0, prev - clearedAmount));
        setNotifications(prev => prev.map(n => n.type === typeKey ? { ...n, isRead: true } : n));

        try {
            await axios.put(`${API_URL}/api/notifications/read-by-type`, { type: typeKey }, {
                headers: { userid: user._id }
            });
        } catch (e) {
            console.error('Lỗi đánh dấu đã đọc loại ' + typeKey, e);
        }
    }, [API_URL, user?._id, unreadByType]);

    // Automatically clear order notifications when viewing the orders page
    useEffect(() => {
        if (location.pathname === '/seller-channel/orders' && unreadByType['NEW_ORDER'] > 0) {
            clearTypeBadge('NEW_ORDER');
        }
    }, [location.pathname, unreadByType, clearTypeBadge]);

    const handleNotifClick = async (notif) => {
        setIsNotifOpen(false);
        if (!notif.isRead) {
            try {
                await axios.put(`${API_URL}/api/notifications/${notif._id}/read`, {}, {
                    headers: { userid: user._id }
                });
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setNotifCount(prev => Math.max(0, prev - 1));
                if (notif.type && unreadByType[notif.type]) {
                    setUnreadByType(prev => ({
                        ...prev,
                        [notif.type]: Math.max(0, (prev[notif.type] || 1) - 1)
                    }));
                }
            } catch (e) {}
        }
        const target = notif.targetUrl || notif.link || '/seller-channel/orders';
        if (target && target !== '#') {
            navigate(target);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.put(`${API_URL}/api/notifications/read-all`, { role: 'seller' }, {
                headers: { userid: user._id }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setNotifCount(0);
            setUnreadByType({});
        } catch (e) {
            console.error('Lỗi đánh dấu đã đọc tất cả:', e);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`relative flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                {/* Brand / Logo */}
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
                    <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0 text-white font-black text-lg">
                            <i className="fas fa-store"></i>
                        </div>
                        <div className="leading-tight">
                            <span className="font-extrabold text-base text-slate-800 tracking-tight block">Kênh Người Bán</span>
                            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">HaiHand B2C</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors shrink-0"
                        title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}
                    >
                        <i className={`fas fa-bars ${!isSidebarOpen ? 'mx-auto' : ''}`}></i>
                    </button>
                </div>

                {/* Shop Quick Info Banner */}
                {isSidebarOpen && (
                    <div className="p-4 mx-3 my-3 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-2xl border border-orange-100/80 flex items-center gap-3">
                        <img 
                            src={shop.avatar || user?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(shop.shopName || user?.name || "Shop") + "&background=EA580C&color=fff"} 
                            alt="Shop Avatar" 
                            className="w-11 h-11 rounded-xl object-cover border border-orange-200 shadow-xs shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{shop.shopName || user?.name || "Shop của tôi"}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Seller Đã Duyệt
                            </span>
                        </div>
                    </div>
                )}

                {/* Navigation items with Badges */}
                <nav className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const badgeCount = item.typeKey ? (unreadByType[item.typeKey] || 0) : 0;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                onClick={() => {
                                    if (item.typeKey && badgeCount > 0) {
                                        clearTypeBadge(item.typeKey);
                                    }
                                }}
                                className={({ isActive }) => `flex items-center px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 group relative ${
                                    isActive 
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25' 
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-orange-600'
                                }`}
                            >
                                <i className={`${item.icon} text-base ${isSidebarOpen ? 'mr-3' : 'mx-auto'} transition-transform group-hover:scale-110`}></i>
                                <span className={`whitespace-nowrap transition-all duration-200 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'}`}>
                                    {item.label}
                                </span>

                                {/* Sidebar Badge (Nhảy số thông báo) */}
                                {badgeCount > 0 && (
                                    isSidebarOpen ? (
                                        <span className="ml-auto bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                                            {badgeCount > 99 ? '99+' : badgeCount}
                                        </span>
                                    ) : (
                                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                    )
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Back to buyer store & logout */}
                <div className="p-3 border-t border-slate-100 space-y-1">
                    <Link
                        to="/"
                        className={`flex items-center px-3 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}
                    >
                        <i className="fas fa-shopping-bag mr-2.5 text-slate-400"></i>
                        {isSidebarOpen && <span>Về Sàn Mua Sắm</span>}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}
                    >
                        <i className="fas fa-sign-out-alt mr-2.5"></i>
                        {isSidebarOpen && <span>Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Topbar */}
                <header className="h-20 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-8 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">HaiHand B2C Seller Hub</span>
                        <span className="hidden sm:inline text-slate-300">/</span>
                        <h2 className="text-base font-extrabold text-slate-800">
                            {shop.shopName || user?.name || "Kênh Bán Hàng"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link 
                            to="/seller-channel/products/create"
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/20 transition-all hover:scale-102"
                        >
                            <i className="fas fa-plus"></i>
                            Đăng sản phẩm mới
                        </Link>

                        {/* Seller Hub Notification Bell */}
                        <div className="relative" ref={notifDropdownRef}>
                            <button
                                onClick={() => setIsNotifOpen(prev => !prev)}
                                aria-label="Thông báo đơn hàng & Shop"
                                className={`p-2.5 relative rounded-xl border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                                    isNotifOpen 
                                        ? 'bg-orange-50 border-orange-200 text-orange-600' 
                                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-orange-600'
                                }`}
                            >
                                <i className="far fa-bell text-base"></i>
                                {notifCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black shadow-xs ring-2 ring-white animate-pulse">
                                        {notifCount > 99 ? '99+' : notifCount}
                                    </span>
                                )}
                            </button>

                            {/* Seller Notification Dropdown Menu */}
                            {isNotifOpen && (
                                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-150">
                                    <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-sm text-slate-900">Thông báo Shop</span>
                                            {notifCount > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                    {notifCount} mới
                                                </span>
                                            )}
                                        </div>
                                        {notifCount > 0 && (
                                            <button 
                                                onClick={handleMarkAllRead}
                                                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors bg-transparent border-0 cursor-pointer p-0"
                                            >
                                                Đã đọc tất cả
                                            </button>
                                        )}
                                    </div>

                                    {/* Notifications List */}
                                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                                        {notifications.length === 0 ? (
                                            <div className="py-10 px-4 text-center text-slate-400">
                                                <span className="text-3xl block mb-2 opacity-60">📭</span>
                                                <p className="text-xs font-semibold">Chưa có thông báo đơn hàng nào</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => {
                                                const { icon, bg } = getSellerNotifIcon(n.type);
                                                return (
                                                    <div
                                                        key={n._id}
                                                        onClick={() => handleNotifClick(n)}
                                                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                                                            !n.isRead 
                                                                ? 'bg-orange-50/50 hover:bg-orange-100/50' 
                                                                : 'bg-white hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-base ${bg}`}>
                                                            {icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                                <h4 className={`text-xs truncate leading-tight ${!n.isRead ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                                    {n.title}
                                                                </h4>
                                                                {!n.isRead && (
                                                                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-1">
                                                                {n.message}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 font-mono block">
                                                                {formatTime(n.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                                        <button
                                            onClick={() => {
                                                setIsNotifOpen(false);
                                                navigate('/seller-channel/orders');
                                            }}
                                            className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors w-full py-1"
                                        >
                                            Xem danh sách đơn hàng →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/haipay/dashboard"
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition-all"
                            title="Ví HaiPay của bạn"
                        >
                            <i className="fas fa-wallet text-amber-600 text-sm"></i>
                            <div className="text-left hidden md:block">
                                <span className="text-[10px] text-amber-700 block font-bold leading-none">Số dư ví</span>
                                <span className="text-xs font-black text-amber-900 leading-none">
                                    {(user?.walletBalance || 0).toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        </Link>

                        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <img 
                                src={user?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || "U") + "&background=f97316&color=fff"} 
                                alt={user?.name} 
                                className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 shadow-xs" 
                            />
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SellerLayout;
