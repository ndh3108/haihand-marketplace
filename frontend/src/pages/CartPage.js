import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { RecommendationSection } from '../components/RecommendationSection';

export default function CartPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [discountCode, setDiscountCode] = useState('HAIHANDVOUCHER100K');

  const fetchCart = async () => {
    if (!currentUser || !currentUser._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/users/cart/${currentUser._id}`);
      setCartItems(data || []);
      // Auto select all by default
      const allIds = (data || []).map(item => item.product?._id).filter(Boolean);
      setSelectedItems(new Set(allIds));
    } catch (error) {
      console.error("Lỗi tải giỏ hàng", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We bypass login check if backend is down just for UI demo purposes, 
    // but in a real flow we uncomment this:
    // if (!currentUser) { navigate('/login'); return; }
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveItem = async (postId) => {
    const isConfirmed = await confirm("Bạn muốn xóa sản phẩm này khỏi giỏ hàng?");
    if (!isConfirmed) return;
    try {
      if (currentUser) {
        await axios.delete(`${API_URL}/api/users/cart/${currentUser._id}/${postId}`);
      }
      setCartItems(prev => prev.filter(i => i.product._id !== postId));
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      window.dispatchEvent(new Event('cartUpdated')); 
    } catch (error) {
      toast.error('Lỗi', "Lỗi không thể gỡ sản phẩm!");
    }
  };

  const handleUpdateQuantity = async (postId, currentQty, change, maxStock) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
        handleRemoveItem(postId);
        return;
    }
    if (maxStock && change > 0 && newQty > maxStock) {
        toast.info('Thông báo', `Sản phẩm này hiện chỉ còn ${maxStock} món trong kho!`);
        return;
    }
    try {
        if (currentUser) {
          await axios.post(`${API_URL}/api/users/cart`, {
              userId: currentUser._id,
              postId: postId,
              quantity: change 
          });
        }
        setCartItems(prev => prev.map(item => {
            if (item.product._id === postId) {
                return { ...item, quantity: newQty };
            }
            return item;
        }));
        window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
        toast.error('Lỗi', "Lỗi cập nhật số lượng!");
    }
  };

  const handleToggleItem = (postId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleToggleSeller = (sellerId, itemIds) => {
    const allSelected = itemIds.every(id => selectedItems.has(id));
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (allSelected) {
        itemIds.forEach(id => next.delete(id));
      } else {
        itemIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.product._id)));
    }
  };

  const handleProceedToCheckout = () => {
    const selectedCartItems = cartItems.filter(item => selectedItems.has(item.product._id));
    if (selectedCartItems.length === 0) {
      return toast.warning('Chú ý', "Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!");
    }

    if (!currentUser) {
      toast.warning('Chú ý', "Vui lòng đăng nhập để tiến hành thanh toán!");
      navigate('/login');
      return;
    }

    // Save selection to sessionStorage as a safeguard on browser refresh
    const checkoutPayload = selectedCartItems.map(item => ({
      product: item.product,
      productId: item.product._id,
      quantity: item.quantity
    }));
    sessionStorage.setItem('checkout_items', JSON.stringify(checkoutPayload));

    navigate('/checkout', {
      state: {
        items: checkoutPayload
      }
    });
  };

  const getImageUrl = (imgStr) => {
    if (!imgStr) return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    return imgStr.startsWith('http') ? imgStr : `${API_URL}/${imgStr.replace(/\\/g, '/')}`;
  };

  const calculateTotal = () => {
    return cartItems.filter(item => selectedItems.has(item.product._id)).reduce((total, item) => {
      if (item.product && item.product.price) return total + (item.product.price * item.quantity);
      return total;
    }, 0);
  };

  // Group cart items by seller
  const groupedCart = cartItems.reduce((acc, item) => {
    const authorId = item.product?.author?._id || 'unknown';
    if (!acc[authorId]) {
      acc[authorId] = {
        author: item.product?.author || { name: 'Người bán ẩn danh', location: 'Chưa rõ', avatarName: 'NA' },
        items: []
      };
    }
    acc[authorId].items.push(item);
    return acc;
  }, {});

  const subTotal = calculateTotal();
  const sellersCount = Object.keys(groupedCart).length;
  const shippingFee = subTotal > 0 ? (sellersCount * 25000) : 0;
  
  let discount = 0;
  let appliedVoucherText = '';
  if (discountCode.toUpperCase() === 'HAIHANDVOUCHER100K' && subTotal >= 5000000) {
      discount = -100000;
      appliedVoucherText = 'Đã áp dụng giảm 100.000 đ cho đơn trên 5 triệu';
  } else if (discountCode.toUpperCase() === 'FREESHIP') {
      discount = -shippingFee;
      appliedVoucherText = 'Đã áp dụng miễn phí vận chuyển';
  } else if (discountCode.trim() !== '') {
      appliedVoucherText = 'Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện';
  }
  
  const finalTotal = Math.max(0, subTotal + shippingFee + discount);

  return (
    <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917] flex flex-col">
      <AppHeader />

      <main className="max-w-[1200px] mx-auto w-full px-4 py-6 flex-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
          <Link to="/" className="hover:text-[#1C1917] flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Trang chủ
          </Link>
          <span>›</span>
          <span className="text-[#1C1917] font-semibold">Giỏ hàng của bạn</span>
          <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full text-xs font-bold ml-2">Đang có {cartItems.length} món từ {Object.keys(groupedCart).length} người bán</span>
        </nav>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-stone-200 border-t-[#FACC15] rounded-full animate-spin"></div>
            </div>
        ) : cartItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-16 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Giỏ hàng trống trơn!</h3>
                <p className="text-stone-500 mb-6">Hãy dạo quanh tìm những món đồ cũ chất lượng nhé.</p>
                <button onClick={() => navigate('/products')} className="bg-[#FACC15] text-[#1C1917] font-bold py-2.5 px-8 rounded-full shadow-sm hover:bg-[#EAB308] transition-colors">
                  Khám phá ngay
                </button>
            </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LEFT COLUMN: CART ITEMS */}
            <div className="w-full lg:w-[65%] flex flex-col gap-4">
              
              {/* Header Row */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex items-center justify-between text-sm font-semibold text-stone-600">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-stone-300 text-[#FACC15] focus:ring-[#FACC15] cursor-pointer"
                    checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                    onChange={handleToggleAll}
                  />
                  <span className="text-[#1C1917]">Chọn tất cả <span className="text-stone-400 font-normal">({cartItems.length} sản phẩm)</span></span>
                </div>
                <div className="hidden sm:flex items-center text-center">
                  <div className="w-24">Đơn giá</div>
                  <div className="w-24">Số lượng</div>
                  <div className="w-24">Số tiền</div>
                  <div className="w-16">Xóa</div>
                </div>
              </div>

              {/* Group by Sellers */}
              {Object.values(groupedCart).map((group, idx) => {
                const seller = group.author;
                const items = group.items;
                const itemIds = items.map(i => i.product._id);
                const allSelected = itemIds.every(id => selectedItems.has(id));

                return (
                  <div key={idx} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-2">
                    
                    {/* Seller Header */}
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-stone-300 text-[#FACC15] focus:ring-[#FACC15] cursor-pointer"
                          checked={allSelected}
                          onChange={() => handleToggleSeller(seller._id, itemIds)}
                        />
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] font-bold flex items-center justify-center text-xs">
                          {seller.avatarName || 'NA'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1917]">{seller.name}</span>
                          {seller.isPersonal && <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Người bán cá nhân</span>}
                          {seller.badge && <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded text-[10px] font-bold">{seller.badge}</span>}
                          {seller.rating && <span className="text-[#EA580C] font-bold text-xs">★ {seller.rating} <span className="text-stone-400">({seller.reviewCount})</span></span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500 font-medium">
                        <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> {seller.location}</span>
                        <button className="text-[#1C1917] hover:text-[#EA580C]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></button>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="p-4">
                      {items.map((item, iIndex) => (
                        <div key={item.product._id} className={`flex items-start sm:items-center gap-3 ${iIndex > 0 ? 'mt-4 pt-4 border-t border-stone-100' : ''}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 mt-4 sm:mt-0 rounded border-stone-300 text-[#FACC15] focus:ring-[#FACC15] cursor-pointer"
                            checked={selectedItems.has(item.product._id)}
                            onChange={() => handleToggleItem(item.product._id)}
                          />
                          <div className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0 relative">
                            <span className="absolute top-1 left-1 bg-white/90 text-[10px] font-bold px-1.5 rounded-full shadow-sm">1 món</span>
                            <img src={getImageUrl(item.product.images?.[0] || item.product.image)} alt={item.product.title} className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="sm:w-[40%]">
                              <h4 className="font-bold text-sm text-[#1C1917] line-clamp-2 leading-snug mb-1.5">{item.product.title}</h4>
                              <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-stone-600">
                                <span className="bg-stone-100 px-2 py-0.5 rounded">{item.product.condition || 'Đã qua sử dụng'}</span>
                                <span className="text-stone-400">{item.product.category}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between w-full sm:w-[60%] sm:justify-end gap-2 sm:gap-6 text-sm font-bold">
                              <div className="text-[#EA580C] sm:w-24 text-center">
                                {new Intl.NumberFormat('vi-VN').format(item.product.price)} đ
                              </div>
                              <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 w-24">
                                <button onClick={() => handleUpdateQuantity(item.product._id, item.quantity, -1, item.product.quantity)} className="px-2 py-1 text-stone-500 hover:text-stone-900">-</button>
                                <input type="text" value={item.quantity} readOnly className="w-full text-center bg-transparent focus:outline-none" />
                                <button onClick={() => handleUpdateQuantity(item.product._id, item.quantity, 1, item.product.quantity)} className="px-2 py-1 text-stone-500 hover:text-stone-900">+</button>
                              </div>
                              <div className="text-[#EA580C] sm:w-24 text-center hidden sm:block">
                                {new Intl.NumberFormat('vi-VN').format(item.product.price * item.quantity)} đ
                              </div>
                              <button onClick={() => handleRemoveItem(item.product._id)} className="text-stone-400 hover:text-red-500 sm:w-16 text-center text-xs">Xóa</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Seller Note / Footer */}
                    {seller.note ? (
                      <div className="bg-orange-50 px-4 py-3 border-t border-orange-100 flex items-center gap-2 text-xs text-orange-800">
                        <span className="font-bold border border-orange-200 bg-orange-100 px-2 rounded">🏷 Ưu đãi từ {(seller?.name || '').split(' ')[0]}:</span>
                        <span>{seller?.note || ''}</span>
                      </div>
                    ) : (
                      <div className="bg-stone-50 px-4 py-3 border-t border-stone-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-stone-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span>Hình thức: <strong>Ship COD đồng kiểm tận nhà</strong> hoặc <strong>Hẹn gặp trực tiếp</strong> tại {(seller?.location || '').split(',')[0]}</span>
                        </div>
                        <span className="font-semibold text-[#EA580C]">Phí ship dự kiến: 35.000 đ</span>
                      </div>
                    )}

                  </div>
                );
              })}

              <div className="bg-[#FEF3C7] rounded-xl p-4 flex items-center justify-between border border-[#FDE68A] shadow-sm mt-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#FACC15] rounded-full flex items-center justify-center shrink-0 shadow-sm text-[#1C1917]">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1C1917]">Được kiểm tra hàng trước khi nhận (Đồng kiểm COD)</h4>
                      <p className="text-xs text-stone-600 mt-0.5">Hỗ trợ thanh toán tiện lợi qua VNPay, Ví HaiPay hoặc COD khi nhận hàng.</p>
                    </div>
                  </div>
                  <button className="text-[#EA580C] font-bold text-sm flex items-center gap-1 hover:underline">
                    Xem chính sách kiểm hàng →
                  </button>
              </div>

            </div>

            {/* RIGHT COLUMN: SUMMARY */}
            <div className="w-full lg:w-[35%]">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 sticky top-[88px]">
                
                <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                  <h3 className="font-bold text-lg text-[#1C1917]">Tóm tắt đơn hàng</h3>
                  <span className="text-xs text-stone-400">Cập nhật theo thời gian thực</span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-[#1C1917]">Mã giảm giá HaiHand / Voucher</label>
                    <span className="text-xs font-bold text-[#EA580C] cursor-pointer hover:underline">Chọn mã khác</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-stone-400">🎟</span>
                      <input 
                        type="text" 
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="w-full h-10 pl-8 pr-3 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-[#FACC15] text-sm font-bold uppercase" 
                      />
                    </div>
                    <button className="px-4 bg-stone-100 text-stone-600 font-bold text-sm rounded-lg hover:bg-stone-200">Áp dụng</button>
                  </div>
                  {appliedVoucherText && (
                    <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${discount < 0 ? 'text-[#EA580C]' : 'text-red-500'}`}>
                      {discount < 0 ? <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : null}
                      {appliedVoucherText}
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-4 pb-4 border-b border-stone-100 text-sm">
                  <div className="flex justify-between text-stone-600 font-medium">
                    <span>Tạm tính ({selectedItems.size} sản phẩm đã chọn)</span>
                    <span className="text-[#1C1917] font-bold">{new Intl.NumberFormat('vi-VN').format(subTotal)} đ</span>
                  </div>
                  <div className="flex justify-between text-stone-600 font-medium">
                    <span className="flex items-center gap-1">Phí ship ước tính <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                    <span className="text-[#1C1917] font-bold">{shippingFee > 0 ? new Intl.NumberFormat('vi-VN').format(shippingFee) + ' đ' : '0 đ'}</span>
                  </div>
                  {discount < 0 && (
                    <div className="flex justify-between text-stone-600 font-medium">
                      <span>Giảm giá voucher sàn</span>
                      <span className="text-[#EA580C] font-bold">{new Intl.NumberFormat('vi-VN').format(discount)} đ</span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className="font-bold text-[#1C1917] text-lg">Tổng thanh toán</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#EA580C] leading-none">{new Intl.NumberFormat('vi-VN').format(finalTotal)} đ</div>
                    <div className="text-[10px] text-stone-400 mt-1">(Đã bao gồm VAT & phí đồng kiểm)</div>
                  </div>
                </div>

                {discount < 0 && (
                  <div className="flex justify-end mb-4">
                    <span className="bg-orange-100 text-[#EA580C] text-[10px] font-bold px-2 py-0.5 rounded-full">Tiết kiệm {new Intl.NumberFormat('vi-VN').format(Math.abs(discount))} đ</span>
                  </div>
                )}

                <button 
                  onClick={handleProceedToCheckout} 
                  disabled={selectedItems.size === 0}
                  className="w-full bg-[#FACC15] hover:bg-[#EAB308] disabled:bg-stone-200 disabled:text-stone-400 text-[#1C1917] font-bold py-3.5 rounded-xl transition-all shadow-md shadow-amber-300/40 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mb-4 cursor-pointer disabled:cursor-not-allowed"
                >
                  Tiến hành đặt hàng ({selectedItems.size} món)
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>

                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Chấp nhận thanh toán:</span>
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">VNPAY</span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Ví HaiPay</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">COD</span>
                  </div>
                </div>

              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mt-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white border border-orange-300 text-orange-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">?</div>
                <p className="text-xs text-orange-800 leading-relaxed">
                  Cần mua thỏa thuận riêng hoặc đặt lịch hẹn gặp lấy trực tiếp? <br/>
                  <Link to="/help-center" className="font-bold text-[#EA580C] hover:underline">Hỏi chuyên viên hỗ trợ 24/7</Link>
                </p>
              </div>

            </div>

          </div>
        )}

        {/* You May Also Like Recommendation */}
        <div className="mt-12">
          <RecommendationSection
            title="Có thể bạn cũng thích"
            subtitle="Gợi ý bổ sung phù hợp cho đơn hàng của bạn"
            icon="🛍️"
            fetchUrl="/api/recommendations/for-you"
            sourceName="cart"
            currentUser={currentUser}
            limit={5}
          />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}