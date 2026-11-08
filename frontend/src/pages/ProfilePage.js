import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import axiosClient, { persistUser } from '../api/axiosClient';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';
import OrderDetailModal from '../components/OrderDetailModal';

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'orders_buy';

  const [user, setUser] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Edit profile form
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    cccd: '',
    bio: '',
    username: '',
    taxId: '',
    gender: '',
    dob: '',
    avatarFrame: 'none',
    profileTitle: 'Người Mới'
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl) {
      if (tabFromUrl === 'seller_register') {
        navigate('/register-seller', { replace: true });
        return;
      }
      if (tabFromUrl === 'posts' || tabFromUrl === 'orders_sell') {
        setActiveTab('orders_buy');
      } else {
        setActiveTab(tabFromUrl);
      }
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const parsedUser = storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null;
    
    if (!parsedUser) {
        navigate('/login');
        return;
    }
    const currentUser = parsedUser;

    setUser(currentUser);
    setEditForm({ 
        name: currentUser.name || '', 
        phone: currentUser.phone || '', 
        address: currentUser.address || '', 
        cccd: currentUser.cccd || '',
        bio: currentUser.bio || '',
        username: currentUser.username || '',
        taxId: currentUser.taxId || '',
        gender: currentUser.gender || '',
        dob: currentUser.dob || '',
        avatarFrame: currentUser.avatarFrame || 'none',
        profileTitle: currentUser.profileTitle || 'Người Mới'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Lấy JWT token từ user đang đăng nhập hoặc localStorage
            const token = currentUser?.token || localStorage.getItem('token') || '';
            const authConfig = {
                headers: {
                    ...(token ? { Authorization: 'Bearer ' + token } : {}),
                    userid: currentUser._id
                },
                withCredentials: true
            };

            const [ordersRes, profileRes] = await Promise.all([
                axios
                    .get(`${API_URL}/api/users/${currentUser._id}/orders`, authConfig)
                    .catch(() => ({ data: [] })),
                axios
                    .get(`${API_URL}/api/users/public-profile/${currentUser._id}`, authConfig)
                    .catch(() => ({ data: { reviews: [], avgRating: 5 } }))
            ]);

            setMyOrders(ordersRes.data || []);
            setMyReviews(profileRes.data.reviews || []);
            setAvgRating(profileRes.data.avgRating || 0);
        } catch (error) {
            console.error("Lỗi tải thông tin Profile", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [API_URL, navigate]);

  const getImageUrl = (imgStr) => {
    if (!imgStr) return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    return imgStr.startsWith('http') ? imgStr : `${API_URL}/${imgStr.replace(/\\/g, '/')}`;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
        const formData = new FormData();
        Object.keys(editForm).forEach(key => formData.append(key, editForm[key]));
        if (selectedImage) formData.append('avatar', selectedImage);
        const { data } = await axiosClient.put(`/api/users/profile/${user._id}`, formData);
        persistUser(data);
        setUser(data);
        setIsEditing(false);
        toast.success('Thành công', 'Đã lưu thông tin tài khoản!');
    } catch (e) {
        toast.error('Lỗi', 'Lỗi khi cập nhật hồ sơ!');
    }
  };

  const handleAvatarChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
          const formData = new FormData();
          formData.append('avatar', file);
          const { data } = await axiosClient.put(`/api/users/profile/${user._id}`, formData);
          persistUser(data);
          setUser(data);
          toast.success('Thành công', 'Đã đổi ảnh đại diện!');
      } catch (err) {
          toast.error('Lỗi', 'Có lỗi xảy ra khi tải ảnh lên');
      }
  };

  const getStatusBadge = (status) => {
      switch (status) {
          case 'Pending':
          case 'Chờ xác nhận':
              return 'bg-amber-100 text-amber-800 border-amber-200';
          case 'Processing':
          case 'Đang chuẩn bị':
              return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'Shipped':
          case 'Đang giao hàng':
              return 'bg-indigo-100 text-indigo-800 border-indigo-200';
          case 'Delivered':
          case 'Đã giao hàng':
          case 'Completed':
          case 'Hoàn thành':
              return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case 'Cancelled':
          case 'Đã hủy':
              return 'bg-rose-100 text-rose-800 border-rose-200';
          default:
              return 'bg-stone-100 text-stone-800 border-stone-200';
      }
  };

  const getFrameStyles = (frame) => {
      switch(frame) {
          case 'bronze': return 'border-amber-700 shadow-amber-700/30';
          case 'silver': return 'border-slate-300 shadow-slate-400/40';
          case 'gold': return 'border-yellow-400 shadow-yellow-500/50';
          case 'diamond': return 'border-cyan-400 shadow-cyan-500/50';
          default: return 'border-white';
      }
  };

  const points = (user?.totalSpent || 0) + (myOrders.length * 100);
  let accountLevel = "Hạng Đồng";
  let nextLevelProgress = 20;
  let nextLevelName = "Hạng Bạc";

  if (points > 10000) {
      accountLevel = "Hạng Kim Cương";
      nextLevelProgress = 100;
      nextLevelName = "Tối đa";
  } else if (points > 5000) {
      accountLevel = "Hạng Vàng";
      nextLevelProgress = Math.min(100, Math.round(((points - 5000) / 5000) * 100));
      nextLevelName = "Hạng Kim Cương";
  } else if (points > 1000) {
      accountLevel = "Hạng Bạc";
      nextLevelProgress = Math.min(100, Math.round(((points - 1000) / 4000) * 100));
      nextLevelName = "Hạng Vàng";
  } else {
      accountLevel = "Hạng Đồng";
      nextLevelProgress = Math.min(100, Math.round((points / 1000) * 100));
      nextLevelName = "Hạng Bạc";
  }

  if (!user) return null;

  const isApprovedSeller = user.isSeller === true && user.sellerStatus === 'approved';
  const isPendingSeller = user.sellerStatus === 'pending';

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">
      <AppHeader />
      
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-8">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className={`w-24 h-24 rounded-full overflow-hidden border-4 bg-stone-100 shadow-sm ${getFrameStyles(user.avatarFrame)}`}>
                            <img src={getImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        {isEditing && (
                            <>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
                                <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-[#FACC15] text-[#1C1917] rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-[#EAB308] z-10">
                                    <i className="fas fa-camera text-xs"></i>
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-[#1C1917]">{user.name}</h1>
                            <span className="text-stone-400 text-sm">@{user.email?.split('@')[0]}</span>
                            {(user.profileTitle && user.profileTitle !== 'Người Mới') && (
                                <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-3 py-0.5 rounded-full text-xs font-black shadow-xs">
                                    🏆 {user.profileTitle}
                                </span>
                            )}
                            {isApprovedSeller ? (
                                <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                    <i className="fas fa-store text-[10px]"></i> Đối tác Seller B2C
                                </span>
                            ) : isPendingSeller ? (
                                <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                    <i className="fas fa-clock text-[10px]"></i> Chờ duyệt Shop
                                </span>
                            ) : (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                    <i className="fas fa-user-check text-[10px]"></i> Thành viên mua sắm
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium mb-4">
                            <span className="flex items-center gap-1">
                                <i className="fas fa-phone text-slate-400"></i> {user.phone || 'Chưa cập nhật SĐT'}
                            </span>
                            <span className="flex items-center gap-1">
                                <i className="fas fa-envelope text-slate-400"></i> {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                                <i className="fas fa-map-marker-alt text-slate-400"></i> {user.address || 'Chưa cập nhật địa chỉ'}
                            </span>
                        </div>
                        
                        {!isEditing && (
                            <div className="flex flex-wrap items-center gap-6 sm:gap-8 bg-stone-50 px-4 py-3 rounded-xl border border-stone-100">
                                <div>
                                    <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider mb-0.5">Đơn mua hàng</p>
                                    <p className="text-xl font-black text-[#1C1917]">{myOrders.length} <span className="text-xs font-medium text-stone-400">đơn</span></p>
                                </div>
                                <div className="w-px h-8 bg-stone-200 hidden md:block"></div>
                                <div>
                                    <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider mb-0.5">Đánh giá</p>
                                    <p className="text-xl font-black text-emerald-600">{myReviews.length} <span className="text-xs font-medium text-stone-400">lượt</span></p>
                                </div>
                                <div className="w-px h-8 bg-stone-200 hidden md:block"></div>
                                <div>
                                    <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider mb-0.5">Ví HaiPay</p>
                                    <p className="text-xl font-black text-orange-600">{(user.walletBalance || 0).toLocaleString('vi-VN')} <span className="text-xs font-medium text-stone-400">đ</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0">
                        {isApprovedSeller ? (
                            <button 
                                onClick={() => window.open('/seller-channel', '_blank')} 
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                            >
                                <i className="fas fa-store"></i> Vào Kênh Người Bán
                            </button>
                        ) : isPendingSeller ? (
                            <a 
                                href="/register-seller" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-full bg-amber-50 border border-amber-200 text-amber-800 font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 text-decoration-none"
                            >
                                <i className="fas fa-clock text-amber-600"></i> Hồ sơ Shop đang duyệt
                            </a>
                        ) : (
                            <a 
                                href="/register-seller" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-full bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs text-decoration-none"
                            >
                                <i className="fas fa-store-alt"></i> Đăng ký mở Shop B2C
                            </a>
                        )}
                        <button onClick={() => setIsEditing(true)} className="w-full bg-stone-50 text-stone-700 font-bold py-2.5 px-6 rounded-xl hover:bg-stone-100 flex items-center justify-center gap-2 transition-colors border border-stone-200">
                            <i className="fas fa-user-edit text-stone-500"></i> Chỉnh sửa thông tin
                        </button>
                        <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="w-full bg-red-50 text-red-600 font-bold py-2.5 px-6 rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 transition-colors border border-red-200">
                            <i className="fas fa-sign-out-alt"></i> Đăng xuất
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Content Area */}
            <div className={`w-full ${isEditing ? 'lg:w-full' : 'lg:w-[65%]'} flex flex-col gap-4`}>
                
                {/* Clean Buyer Tabs */}
                {!isEditing && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button 
                            onClick={() => setActiveTab('orders_buy')} 
                            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                                activeTab === 'orders_buy' 
                                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                            <i className="fas fa-shopping-bag"></i>
                            Đơn mua của tôi 
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'orders_buy' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                                {myOrders.length}
                            </span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('reviews')} 
                            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                                activeTab === 'reviews' 
                                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                            <i className="fas fa-star"></i>
                            Đánh giá ({myReviews.length})
                        </button>
                    </div>
                )}

                {/* Edit Profile Form */}
                {isEditing && (
                    <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs animate-fade-in mb-4 max-w-4xl mx-auto w-full">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Chỉnh sửa hồ sơ cá nhân</h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">Họ và tên *</label>
                                    <input type="text" className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 text-sm font-semibold" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">Số điện thoại *</label>
                                    <input type="text" className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 text-sm font-medium" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} required />
                                </div>
                            </div>
                    
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">Địa chỉ nhận hàng mặc định</label>
                                <input type="text" className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 text-sm font-medium" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                    
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">Giới thiệu ngắn</label>
                                <textarea className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 min-h-[80px] text-sm" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Giới thiệu về bạn..." />
                            </div>
                    
                            <div className="pt-4 mt-4 border-t border-stone-100">
                                <h4 className="font-bold text-sm text-stone-800 mb-1">Thông tin định danh</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-600 mb-1">CCCD / CMND</label>
                                        <input type="text" className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 text-sm" value={editForm.cccd} onChange={e => setEditForm({...editForm, cccd: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-600 mb-1">Mã số thuế</label>
                                        <input type="text" className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 focus:outline-none focus:border-orange-500 text-sm font-mono" value={editForm.taxId} onChange={e => setEditForm({...editForm, taxId: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-stone-100">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 font-bold text-stone-500 hover:text-stone-800 text-sm">Hủy</button>
                            <button type="submit" className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm text-sm">Lưu thay đổi</button>
                        </div>
                    </form>
                )}

                {/* TAB 1: BUYER ORDERS */}
                {!isEditing && activeTab === 'orders_buy' && (
                    <div className="flex flex-col gap-4">
                        {myOrders.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-12 text-center text-stone-500 animate-fade-in">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl text-stone-400">
                                    <i className="fas fa-shopping-bag"></i>
                                </div>
                                <h3 className="font-bold text-base text-stone-800">Chưa có đơn mua nào</h3>
                                <p className="text-xs text-stone-400 mt-1">Khám phá các sản phẩm chất lượng trên sàn HaiHand ngay!</p>
                                <button onClick={() => navigate('/products')} className="mt-4 px-6 py-2.5 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 shadow-sm transition-all">
                                    Khám phá sản phẩm
                                </button>
                            </div>
                        ) : (
                            myOrders.map(order => {
                                const st = order.canonicalStatus || order.status;
                                const items = order.orderItems && order.orderItems.length > 0
                                    ? order.orderItems
                                    : (order.items || []);

                                return (
                                    <div key={order._id} className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 animate-fade-in hover:border-orange-300 transition-colors">
                                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-slate-700">Mã đơn: #{order._id.substring(0, 8).toUpperCase()}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(st)}`}>
                                                {st}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-3">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="flex gap-4 p-2 hover:bg-stone-50 rounded-xl transition-colors">
                                                    <div className="w-16 h-16 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                                                        <img src={getImageUrl(item.image || (item.images && item.images[0]))} alt={item.title || item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center min-w-0">
                                                        <h4 className="font-bold text-sm text-[#1C1917] truncate">{item.title || item.name || 'Sản phẩm B2C'}</h4>
                                                        <p className="text-xs text-stone-400 mt-0.5">Số lượng: x{item.quantity || 1}</p>
                                                        <p className="text-sm font-bold text-orange-600 mt-0.5">{(item.price || 0).toLocaleString('vi-VN')} đ</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {order.shippingCode && (
                                            <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                                                <span>
                                                    <i className="fas fa-truck mr-1.5 text-indigo-600"></i>
                                                    <strong>Vận chuyển ({order.shippingCarrier || 'Bưu cục'}):</strong> {order.shippingCode}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedOrder(order)}
                                                className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                <i className="fas fa-route mr-1.5"></i>
                                                Theo dõi vận đơn & Chi tiết
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-stone-500">Tổng thanh toán:</span>
                                                <span className="text-lg font-black text-orange-600">
                                                    {(order.totalPrice || order.totalAmount || 0).toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* TAB 2: REVIEWS */}
                {!isEditing && activeTab === 'reviews' && (
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6">
                        {myReviews.map((rev, i) => (
                            <div key={i} className="mb-4 pb-4 border-b border-stone-100 last:border-0 last:mb-0 last:pb-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <img src={rev.buyer?.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="w-10 h-10 rounded-full object-cover bg-stone-100" alt="avt" />
                                        <div>
                                            <p className="font-bold text-sm text-[#1C1917]">{rev.buyer?.name || 'Khách hàng'}</p>
                                            <p className="text-xs text-stone-400">{new Date(rev.createdAt || Date.now()).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    </div>
                                    <div className="text-amber-500 text-sm">{"★".repeat(rev.rating || 5)}</div>
                                </div>
                                <p className="text-sm text-stone-700 italic">"{rev.comment}"</p>
                            </div>
                        ))}
                        {myReviews.length === 0 && (
                            <div className="text-center py-10">
                                <i className="fas fa-star text-3xl text-stone-300 mb-2 block"></i>
                                <p className="text-sm font-medium text-stone-500">Chưa có đánh giá nào.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Sidebar Area */}
            {!isEditing && (
                <div className="w-full lg:w-[35%] flex flex-col gap-4">
                    
                    {/* Account Rank Card */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-medal text-orange-500 text-base"></i>
                                <h3 className="font-bold text-[#1C1917] text-sm">Hạng thành viên</h3>
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{accountLevel}</span>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between text-xs font-bold text-stone-600 mb-2">
                                <span>Tiến trình lên <strong>{nextLevelName}</strong></span>
                                <span className="text-orange-600">{nextLevelProgress}%</span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-1.5 mb-2">
                                <div className="bg-orange-500 h-1.5 rounded-full" style={{width: `${nextLevelProgress}%`}}></div>
                            </div>
                            <p className="text-[10px] text-stone-400">Tích lũy chi tiêu để thăng hạng và hưởng thêm ưu đãi voucher B2C.</p>
                        </div>
                    </div>

                    {/* HaiPay Wallet Card */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-wallet text-orange-500 text-base"></i>
                                <h3 className="font-bold text-[#1C1917] text-sm">Ví điện tử HaiPay</h3>
                            </div>
                            <button onClick={() => navigate('/haipay/dashboard')} className="text-xs font-bold text-orange-600 hover:underline">
                                Xem ví →
                            </button>
                        </div>
                        <div className="mb-4">
                            <p className="text-2xl font-black text-[#1C1917] tracking-tight">
                                {(user.walletBalance || 0).toLocaleString('vi-VN')} <span className="text-base font-bold">đ</span>
                            </p>
                            <p className="text-xs text-stone-500 mt-1 font-medium">Bảo chứng thanh toán và hoàn tiền an toàn 100%</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => navigate('/haipay/dashboard')} className="flex-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold py-2 text-xs rounded-xl transition-colors">
                                Nạp tiền / Rút tiền
                            </button>
                            <button onClick={() => navigate('/haipay/dashboard')} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 text-xs rounded-xl transition-colors">
                                Lịch sử ví
                            </button>
                        </div>
                    </div>

                    {/* Support Card */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-headset text-orange-500 text-base"></i>
                            <h3 className="font-bold text-[#1C1917] text-sm">Trung tâm Hỗ trợ B2C</h3>
                        </div>
                        <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                            Tổng đài hỗ trợ người mua & người bán HaiHand 24/7. Hỗ trợ đối soát thanh toán và xử lý sự cố giao nhận.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => navigate('/dispute-resolution')} className="flex items-center justify-between p-2.5 border border-stone-100 rounded-xl hover:bg-stone-50 transition-colors group">
                                <span className="text-xs font-bold text-stone-600 group-hover:text-orange-600 flex items-center gap-2">
                                    <i className="fas fa-shield-alt text-amber-500"></i> Chính sách giải quyết khiếu nại
                                </span>
                                <i className="fas fa-chevron-right text-stone-300 text-[10px]"></i>
                            </button>
                            <button onClick={() => navigate('/chat')} className="flex items-center justify-between p-2.5 border border-stone-100 rounded-xl hover:bg-stone-50 transition-colors group">
                                <span className="text-xs font-bold text-stone-600 group-hover:text-orange-600 flex items-center gap-2">
                                    <i className="fas fa-comments text-blue-500"></i> Hỗ trợ trực tuyến
                                </span>
                                <i className="fas fa-chevron-right text-stone-300 text-[10px]"></i>
                            </button>
                        </div>
                    </div>

                </div>
            )}

        </div>
      </main>
      
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <AppFooter />
    </div>
  );
}