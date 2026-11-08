import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom'; 
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from './Toast';
import './Header.css'; 
import moment from 'moment';
import 'moment/locale/vi';
moment.locale('vi');

const Header = ({ keyword: propKeyword, setKeyword: propSetKeyword, onSearch, location: propLocation, setLocation: propSetLocation }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams(); 
  
  const urlSearch = searchParams.get('search') || '';
  const urlLocation = searchParams.get('location') || 'Toàn quốc';

  const [localKeyword, setLocalKeyword] = useState(urlSearch);
  const [localLocation, setLocalLocation] = useState(urlLocation);
  
  const keyword = propKeyword !== undefined ? propKeyword : localKeyword;
  const location = propLocation !== undefined ? propLocation : localLocation;

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [tempCity, setTempCity] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');
  
  
  const [isScrolled, setIsScrolled] = useState(false);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored && stored !== "undefined" ? JSON.parse(stored) : null;
  });

  const { socket } = useSocket();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  
  useEffect(() => {
    const handleScroll = () => {
      
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/api/categories`).then(({ data }) => setCategories([{name: 'Tất cả', icon: '🏠'}, ...data])).catch(console.error);
    axios.get('https://provinces.open-api.vn/api/?depth=2').then(res => setProvinces(res.data)).catch(console.error);

    if (user?._id) {
      const fetchData = async () => {
        try {
          const userRes = await axios.get(`${API_URL}/api/users/${user._id}`);
          if (userRes.data) {
            setUser(userRes.data);
            localStorage.setItem('user', JSON.stringify(userRes.data));
          }

          axios.get(`${API_URL}/api/users/cart/${user._id}`).then(({ data }) => setCartCount(data.length));
          axios.get(`${API_URL}/api/messages/unread-count/${user._id}`).then(({ data }) => setUnreadCount(data.count));
          axios.get(`${API_URL}/api/notifications`, { headers: { 'userid': user._id } }).then(({ data }) => {
              setNotifications(data.notifications || []);
              setNotifCount(data.unreadCount || 0);
          });
        } catch (err) { console.error(err); }
      };

      fetchData();
      const notifInterval = setInterval(fetchData, 10000);

      if (socket) {
        const handleGetMessage = () => setUnreadCount(prev => prev + 1);
        const handleNewNotif = (newNotif) => {
          setNotifications(prev => [newNotif, ...prev]);
          setNotifCount(prev => prev + 1);
          toast.info(`🔔 ${newNotif.title}`);
        };

        socket.on('getMessage', handleGetMessage);
        socket.on('new_notification', handleNewNotif);

        return () => {
          clearInterval(notifInterval);
          socket.off('getMessage', handleGetMessage);
          socket.off('new_notification', handleNewNotif);
        };
      }

      return () => {
        clearInterval(notifInterval);
      };
    }
  }, [user?._id, socket]);

  useEffect(() => {
    if (tempCity) {
        const city = provinces.find(p => p.name === tempCity);
        setDistricts(city ? city.districts : []);
    } else { setDistricts([]); }
    setTempDistrict('');
  }, [tempCity, provinces]);

  const executeSearch = (newLoc, newKey) => {
    const sKey = newKey !== undefined ? newKey : keyword;
    const sLoc = newLoc !== undefined ? newLoc : location;
    const params = new URLSearchParams();
    if (sKey.trim()) params.set('search', sKey);
    if (sLoc !== 'Toàn quốc') params.set('location', sLoc);
    
    navigate(`/products?${params.toString()}`);
    if (onSearch) onSearch();
  };

  const handleApplyLocation = () => {
    let finalLoc = 'Toàn quốc';
    if (tempCity) finalLoc = tempDistrict ? `${tempDistrict}, ${tempCity}` : tempCity;
    if (propSetLocation) propSetLocation(finalLoc); else setLocalLocation(finalLoc);
    setShowLocationModal(false);
    executeSearch(finalLoc);
  };

  const handleNotificationClick = async (id, link) => {
      setShowNotifMenu(false);
      try { 
        await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, { headers: { 'userid': user._id } }); 
        setNotifCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      } catch(e){}
      if(link) navigate(link);
  };

  const handleReadAll = async () => {
      try { 
        await axios.put(`${API_URL}/api/notifications/read-all`, {}, { headers: { 'userid': user._id } }); 
        setNotifCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch(e){}
  };

  return (
    
    <header className={`bg-warning shadow-sm sticky-top ${isScrolled ? 'py-2' : 'py-3'}`} style={{ zIndex: 1040, top: 0, transition: 'padding 0.3s ease' }}>
      <div className="container">
        
        
        <div 
          className="d-none d-md-flex justify-content-between align-items-center w-100 overflow-hidden"
          style={{ 
            maxHeight: isScrolled ? '0px' : '40px', 
            opacity: isScrolled ? 0 : 1, 
            marginBottom: isScrolled ? '0px' : '15px',
            transition: 'all 0.3s ease-in-out' 
          }}
        >
        </div>

        
        <div className="d-flex justify-content-between align-items-center">
          
          <div className="d-flex align-items-center gap-4">
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')} className="hover-scale">
                <img src="/logo.png" alt="HaiHand" style={{height: '32px', objectFit: 'contain'}} />
            </div>
            <div className="position-relative" onMouseEnter={() => setShowCategoryMenu(true)} onMouseLeave={() => setShowCategoryMenu(false)}>
                <div className="d-flex align-items-center gap-2 text-white px-3 py-2 rounded-3" style={{cursor: 'pointer'}}>
                    <span className="fs-4 fw-bold">≡</span><span className="fw-bold d-none d-md-block">Danh mục</span>
                </div>
                {showCategoryMenu && (
                    <div className="position-absolute bg-white shadow-lg rounded-3 py-2" style={{top: '100%', left: '0', width: '260px', zIndex: 1050, border: '1px solid #eaeaea'}}>
                        {categories.map((cat, idx) => (
                            <div key={idx} className="px-3 py-2 d-flex align-items-center gap-3 transition-all hover-bg-light" style={{cursor: 'pointer'}} onClick={() => navigate(`/products?category=${cat.name}`)}>
                                <div className="d-flex justify-content-center align-items-center bg-light rounded-circle shadow-sm" style={{width: '35px', height: '35px', overflow: 'hidden'}}>
                                    {cat.name === 'Tất cả' ? <span style={{fontSize: '18px'}}>{cat.icon}</span> : <img src={cat.image?.startsWith('http') ? cat.image : `${API_URL}/uploads/${cat.image}`} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={cat.name}/>}
                                </div>
                                <span className="fw-bold text-dark" style={{fontSize: '14px'}}>{cat.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
          
          <div className="search-bar-wrapper shadow-sm mx-3 d-flex align-items-center bg-white" style={{ borderRadius: '50px', padding: '5px 8px', maxWidth: '600px', flex: 1 }}>
              <span className="ms-2 text-muted">🔍</span>
              <input type="text" className="search-input" placeholder="Tìm sản phẩm, danh mục..." value={keyword} onChange={(e) => propSetKeyword ? propSetKeyword(e.target.value) : setLocalKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeSearch()} style={{ border: 'none', outline: 'none', padding: '10px', flex: 1, background: 'transparent' }} />
              <div className="position-relative border-start border-2 px-3 py-1 d-flex align-items-center d-none d-lg-flex" style={{ minWidth: '140px' }}>
                  <div className="d-flex align-items-center w-100" style={{ cursor: 'pointer' }} onClick={() => setShowLocationModal(!showLocationModal)}>
                      <span className="fw-bold text-muted text-truncate" style={{maxWidth: '120px'}} title={location}>{location.split(',')[0]}</span><span className="ms-2 text-muted small">▼</span>
                  </div>
                  {showLocationModal && (
                      <div className="position-absolute bg-white p-3 rounded-4 shadow-lg" style={{ top: '140%', right: '0', width: '300px', zIndex: 1060, border: '1px solid #eaeaea' }}>
                          <h6 className="fw-bold mb-3 text-center text-dark">Khu vực</h6>
                          <select className="form-select border-2 rounded-3 mb-2" value={tempCity} onChange={e => setTempCity(e.target.value)}>
                              <option value="">Toàn quốc</option>
                              {provinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                          </select>
                          <select className="form-select border-2 rounded-3 mb-3" value={tempDistrict} onChange={e => setTempDistrict(e.target.value)} disabled={!tempCity}>
                              <option value="">Tất cả quận huyện</option>
                              {districts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                          </select>
                          <button className="btn btn-warning w-100 fw-bold rounded-pill text-dark" onClick={handleApplyLocation}>Áp dụng</button>
                      </div>
                  )}
              </div>
              <button className="search-button rounded-pill px-4 fw-bold bg-dark text-white border-0 py-2 ms-1" onClick={() => executeSearch()}>Tìm kiếm</button>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="position-relative d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm hover-scale" style={{ width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px' }} onClick={() => navigate('/cart')}>
              🛒 {cartCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize: '10px'}}>{cartCount}</span>}
            </div>

            {user ? (
              <div className="d-flex align-items-center gap-3">
                  <div onClick={() => navigate('/haipay/dashboard')} className="d-none d-sm-flex align-items-center gap-1 bg-white text-dark rounded-pill px-3 py-1 shadow-sm border" style={{cursor: 'pointer'}}>
                      <span style={{color: '#EA580C', fontSize: '16px'}}>💳</span>
                      <span className="fw-bold" style={{fontSize: '13px'}}>Ví HaiPay</span>
                  </div>

                  <div className="text-white position-relative hover-scale d-flex align-items-center justify-content-center" style={{cursor: 'pointer', fontSize: '20px', width: '40px', height: '40px'}} onClick={() => navigate('/chat')}>
                      💬 {unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize: '10px'}}>{unreadCount}</span>}
                  </div>

                  <div className="position-relative" onMouseEnter={() => setShowNotifMenu(true)} onMouseLeave={() => setShowNotifMenu(false)}>
                      <div className="text-white position-relative hover-scale d-flex align-items-center justify-content-center" style={{cursor: 'pointer', fontSize: '20px', width: '40px', height: '40px'}}>
                          <i className="far fa-bell text-2xl"></i> {notifCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-orange-500">{notifCount > 99 ? '99+' : notifCount}</span>}
                      </div>
                      {showNotifMenu && (
                          <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden z-[1050] animate-fade-in-up">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                  <h6 className="font-extrabold text-slate-800 m-0">Thông báo</h6>
                                  {notifCount > 0 && (
                                      <button onClick={handleReadAll} className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors border-none bg-transparent p-0 m-0 cursor-pointer">Đánh dấu đã đọc tất cả</button>
                                  )}
                              </div>
                              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                  {notifications.length === 0 && (
                                      <div className="p-8 text-center text-slate-400">
                                          <i className="far fa-bell-slash text-4xl mb-3 opacity-50"></i>
                                          <p className="text-sm font-medium">Bạn chưa có thông báo nào</p>
                                      </div>
                                  )}
                                  {notifications.map((n, i) => (
                                      <div key={i} onClick={() => handleNotificationClick(n._id, n.link)} className={`p-4 border-b border-slate-50 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50/60' : 'bg-transparent'}`}>
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${!n.isRead ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                              <i className={`fas ${n.type === 'ORDER' ? 'fa-box' : n.type === 'MESSAGE' ? 'fa-comment' : n.type === 'PAYMENT' ? 'fa-wallet' : 'fa-bell'}`}></i>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <p className={`text-sm mb-1 ${!n.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{n.title}</p>
                                              <p className="text-xs text-slate-500 mb-1 line-clamp-2">{n.message}</p>
                                              <p className="text-[10px] font-medium text-slate-400">{moment(n.createdAt).fromNow()}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="position-relative" onMouseEnter={() => setShowProfileMenu(true)} onMouseLeave={() => setShowProfileMenu(false)}>
                      <div className="d-flex align-items-center gap-2 bg-warning-subtle p-1 pe-3 rounded-pill" style={{cursor:'pointer'}}>
                          <div className="bg-white text-warning rounded-circle fw-bold d-flex justify-content-center align-items-center shadow-sm" style={{width:'35px', height:'35px', overflow: 'hidden'}}>
                              {user.avatar ? <img src={user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="avt" /> : user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="fw-bold text-white d-none d-md-block small">{user.name} ▾</span>
                      </div>
                      {showProfileMenu && (
                          <div className="position-absolute bg-white shadow-lg rounded-4 p-3" style={{top: '100%', right: '0', width: '280px', border: '1px solid #eaeaea', zIndex: 1050}}>
                              <div className="d-flex align-items-center gap-3 mb-3 border-bottom pb-3 text-dark">
                                 <div className="bg-warning text-white rounded-circle fw-bold d-flex justify-content-center align-items-center" style={{width:'50px', height:'50px', fontSize: '20px', overflow: 'hidden'}}>
                                    {user.avatar ? <img src={user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="avt" /> : user.name.charAt(0).toUpperCase()}
                                 </div>
                                 <div><h6 className="fw-bold mb-0">{user.name}</h6><small className="text-muted">{user.email}</small></div>
                              </div>
                              <div onClick={() => navigate('/haipay/dashboard')} className="mb-2 d-flex justify-content-between align-items-center px-3 py-2 rounded-3 shadow-sm" style={{cursor: 'pointer', backgroundColor: '#e7f1ff', border: '1px solid #cfe2ff'}}>
                                  <span className="fw-bold text-primary" style={{fontSize: '14px'}}>💳 Ví HàiPay</span>
                                  <span className="badge bg-primary">{(user.walletBalance || 0).toLocaleString('vi-VN')} đ</span>
                              </div>
                              <ul className="list-unstyled mb-0">
                                 <li className="mb-1"><div onClick={() => navigate('/profile')} className="d-block text-dark px-3 py-2 rounded-3 hover-bg-light" style={{cursor: 'pointer'}}>👤 Quản lý cá nhân</div></li>
                                 <li className="mb-1"><div onClick={() => navigate('/favorites')} className="d-block text-dark px-3 py-2 rounded-3 hover-bg-light" style={{cursor: 'pointer'}}>❤️ Tin đăng đã lưu</div></li>
                                 <li className="mb-1"><div onClick={() => navigate('/followed/followed')} className="d-block text-dark px-3 py-2 rounded-3 hover-bg-light" style={{cursor: 'pointer'}}>👥 Bạn bè (Theo dõi)</div></li>
                                 <li className="border-top pt-2 mt-1"><div onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="d-block text-danger fw-bold px-3 py-2 rounded-3 hover-bg-light" style={{cursor: 'pointer'}}>🚪 Đăng xuất</div></li>
                              </ul>
                          </div>
                      )}
                  </div>
              </div>
            ) : <button onClick={() => navigate('/login')} className="btn btn-light fw-bold text-warning rounded-pill px-4 shadow-sm">Đăng nhập</button>}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;