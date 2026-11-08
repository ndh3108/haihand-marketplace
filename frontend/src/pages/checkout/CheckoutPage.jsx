import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { AppHeader } from '../../components/AppHeader';
import { AppFooter } from '../../components/AppFooter';
import { useToast } from '../../components/Toast';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }, []);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  // --- 1. Items State (from route state or sessionStorage) ---
  const [items] = useState(() => {
    if (location.state?.items && Array.isArray(location.state.items) && location.state.items.length > 0) {
      return location.state.items;
    }
    try {
      const saved = sessionStorage.getItem('checkout_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Cannot read checkout_items from sessionStorage:', e);
    }
    return [];
  });

  // --- 2. Address Book & Selection State ---
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Form state for creating a new address
  const [newAddr, setNewAddr] = useState({
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    provinceId: '',
    provinceName: '',
    districtId: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    street: '',
    isDefault: false
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [savingAddress, setSavingAddress] = useState(false);

  // --- 3. Dynamic Shipping State ---
  // Keyed by sellerId -> { fee: number, carrier: string, provider: string, expectedDeliveryTime: string, loading: boolean, error?: string }
  const [shippingQuotes, setShippingQuotes] = useState({});

  // --- 4. Payment & Discount State ---
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'VNPAY' | 'HAIPAY'
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, discountAmount, label }
  const [voucherError, setVoucherError] = useState('');

  // Wallet balance
  const [walletInfo, setWalletInfo] = useState({
    isActive: !!currentUser?.isWalletActive,
    balance: Number(currentUser?.walletBalance) || 0,
    loading: false
  });

  // Submission / Loading
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null); // result payload if order completed without gateway redirect

  // --- Helper: Format Image URL ---
  const getImageUrl = (img) => {
    if (!img) return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${API_URL}/${img.replace(/\\/g, '/')}`;
  };

  const formatPrice = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' đ';

  // --- 5. Group Items by Seller ---
  const groupedPackages = useMemo(() => {
    const groups = {};
    for (const item of items) {
      const p = item.product || item;
      const authorObj = p.author || {};
      const sellerId = p.sellerId || (typeof authorObj === 'object' ? authorObj._id : authorObj) || 'system_shop';
      
      const shopName = authorObj?.shopInfo?.shopName || authorObj?.name || 'Gian hàng B2C HaiHand';
      const shopAvatar = authorObj?.shopInfo?.avatar || authorObj?.avatar || '';
      const shopAddress = authorObj?.shopInfo?.address || authorObj?.address || 'Toàn quốc';

      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerId,
          shopName,
          shopAvatar,
          shopAddress,
          items: []
        };
      }

      groups[sellerId].items.push({
        product: p,
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: Number(p.price) || 0
      });
    }

    return Object.values(groups);
  }, [items]);

  // --- 6. Fetch User Addresses and Wallet Info ---
  const fetchAddresses = useCallback(async () => {
    try {
      setLoadingAddress(true);
      const res = await axiosClient.get('/api/users/me/addresses');
      const list = res.data?.addresses || [];
      setAddresses(list);

      // Select default or first address
      if (list.length > 0) {
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddress(def);
      } else if (res.data?.legacyAddress) {
        // User has a legacy address string without structured fields
        setSelectedAddress({
          fullName: res.data?.profile?.name || currentUser?.name || 'Khách hàng',
          phone: res.data?.profile?.phone || currentUser?.phone || '',
          street: res.data.legacyAddress,
          fullAddress: res.data.legacyAddress,
          isLegacy: true
        });
      }
    } catch (err) {
      console.error('Lỗi tải danh sách địa chỉ:', err);
    } finally {
      setLoadingAddress(false);
    }
  }, [currentUser]);

  const fetchWallet = useCallback(async () => {
    try {
      setWalletInfo((prev) => ({ ...prev, loading: true }));
      const res = await axiosClient.get('/api/haipay/status');
      if (res.data) {
        setWalletInfo({
          isActive: !!res.data.isWalletActive,
          balance: Number(res.data.walletBalance) || 0,
          loading: false
        });
      }
    } catch (err) {
      // Keep local state if error
      setWalletInfo((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
    fetchWallet();
  }, [fetchAddresses, fetchWallet]);

  // --- 7. Load Provinces Master Data when opening address modal ---
  useEffect(() => {
    if (showNewAddressForm && provinces.length === 0) {
      axiosClient
        .get('/api/shipping/provinces')
        .then((res) => {
          if (Array.isArray(res.data)) setProvinces(res.data);
        })
        .catch((err) => console.warn('Lỗi tải tỉnh/thành:', err));
    }
  }, [showNewAddressForm, provinces.length]);

  // Handle Province change -> Load Districts
  const handleProvinceChange = async (e) => {
    const provId = e.target.value;
    const selectedProv = provinces.find((p) => String(p.ProvinceID) === String(provId));
    setNewAddr((prev) => ({
      ...prev,
      provinceId: provId,
      provinceName: selectedProv ? selectedProv.ProvinceName : '',
      districtId: '',
      districtName: '',
      wardCode: '',
      wardName: ''
    }));
    setDistricts([]);
    setWards([]);

    if (provId) {
      try {
        const res = await axiosClient.get(`/api/shipping/districts?provinceId=${provId}`);
        if (Array.isArray(res.data)) setDistricts(res.data);
      } catch (err) {
        console.warn('Lỗi tải quận/huyện:', err);
      }
    }
  };

  // Handle District change -> Load Wards
  const handleDistrictChange = async (e) => {
    const distId = e.target.value;
    const selectedDist = districts.find((d) => String(d.DistrictID) === String(distId));
    setNewAddr((prev) => ({
      ...prev,
      districtId: distId,
      districtName: selectedDist ? selectedDist.DistrictName : '',
      wardCode: '',
      wardName: ''
    }));
    setWards([]);

    if (distId) {
      try {
        const res = await axiosClient.get(`/api/shipping/wards?districtId=${distId}`);
        if (Array.isArray(res.data)) setWards(res.data);
      } catch (err) {
        console.warn('Lỗi tải phường/xã:', err);
      }
    }
  };

  const handleWardChange = (e) => {
    const wCode = e.target.value;
    const selectedW = wards.find((w) => String(w.WardCode) === String(wCode));
    setNewAddr((prev) => ({
      ...prev,
      wardCode: wCode,
      wardName: selectedW ? selectedW.WardName : ''
    }));
  };

  // Save new address via API
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.fullName.trim() || !newAddr.phone.trim() || !newAddr.provinceId || !newAddr.districtId || !newAddr.wardCode || !newAddr.street.trim()) {
      return toast.warning('Chú ý', 'Vui lòng điền đầy đủ tất cả thông tin địa chỉ.');
    }

    setSavingAddress(true);
    try {
      const payload = {
        fullName: newAddr.fullName.trim(),
        phone: newAddr.phone.trim(),
        provinceId: Number(newAddr.provinceId),
        provinceName: newAddr.provinceName,
        districtId: Number(newAddr.districtId),
        districtName: newAddr.districtName,
        wardCode: String(newAddr.wardCode),
        wardName: newAddr.wardName,
        street: newAddr.street.trim(),
        isDefault: !!newAddr.isDefault
      };

      const res = await axiosClient.post('/api/addresses', payload);
      const saved = res.data?.address;
      const all = res.data?.addresses || [];
      setAddresses(all);
      setSelectedAddress(saved || all[all.length - 1]);
      setShowNewAddressForm(false);
      setShowAddressModal(false);
      toast.success('Thành công', 'Đã thêm địa chỉ giao hàng mới!');
    } catch (err) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể lưu địa chỉ');
    } finally {
      setSavingAddress(false);
    }
  };

  // --- 8. Dynamic Shipping Quote Calculation Per Seller Package ---
  useEffect(() => {
    if (!selectedAddress || groupedPackages.length === 0) return;

    groupedPackages.forEach((pkg) => {
      // Mark loading
      setShippingQuotes((prev) => ({
        ...prev,
        [pkg.sellerId]: {
          ...(prev[pkg.sellerId] || {}),
          loading: true,
          error: null
        }
      }));

      const quotePayload = {
        sellerId: pkg.sellerId,
        toAddress: selectedAddress,
        items: pkg.items.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity
        }))
      };

      axiosClient
        .post('/api/shipping/calculate', quotePayload)
        .then((res) => {
          const data = res.data;
          setShippingQuotes((prev) => ({
            ...prev,
            [pkg.sellerId]: {
              fee: Number(data.fee) || 25000,
              carrier: data.carrier || 'HaiHand Express',
              provider: data.provider || 'mock',
              expectedDeliveryTime: data.expectedDeliveryTime || '2-4 ngày',
              loading: false
            }
          }));
        })
        .catch((err) => {
          console.warn(`Shipping calculation fallback for seller ${pkg.sellerId}:`, err);
          // Safe fallback standard 25.000 đ
          setShippingQuotes((prev) => ({
            ...prev,
            [pkg.sellerId]: {
              fee: 25000,
              carrier: 'HaiHand Express (Tiêu chuẩn)',
              provider: 'mock',
              expectedDeliveryTime: '2-4 ngày làm việc',
              loading: false
            }
          }));
        });
    });
  }, [selectedAddress, groupedPackages]);

  // --- 9. Financial Calculations ---
  const itemsSubtotal = useMemo(() => {
    return groupedPackages.reduce((acc, pkg) => {
      const pkgSum = pkg.items.reduce((s, i) => s + i.price * i.quantity, 0);
      return acc + pkgSum;
    }, 0);
  }, [groupedPackages]);

  const totalShippingFee = useMemo(() => {
    return groupedPackages.reduce((acc, pkg) => {
      const q = shippingQuotes[pkg.sellerId];
      const fee = q?.fee !== undefined ? q.fee : 25000;
      return acc + fee;
    }, 0);
  }, [groupedPackages, shippingQuotes]);

  // Voucher apply handler
  const handleApplyVoucher = () => {
    setVoucherError('');
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setAppliedVoucher(null);
      return;
    }

    if (code === 'HAIHANDVOUCHER100K') {
      if (itemsSubtotal >= 5000000) {
        setAppliedVoucher({
          code: 'HAIHANDVOUCHER100K',
          discountAmount: 100000,
          label: 'Giảm 100.000 đ (Đơn từ 5.000.000 đ)'
        });
        toast.success('Áp dụng thành công', 'Mã giảm giá 100.000 đ đã được áp dụng!');
      } else {
        setVoucherError('Mã này chỉ áp dụng cho đơn hàng từ 5.000.000 đ trở lên.');
      }
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({
        code: 'FREESHIP',
        discountAmount: totalShippingFee,
        label: 'Miễn phí vận chuyển toàn bộ kiện hàng'
      });
      toast.success('Áp dụng thành công', 'Đã miễn phí vận chuyển cho toàn bộ đơn hàng!');
    } else {
      setVoucherError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  };

  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.code === 'FREESHIP') return totalShippingFee;
    return appliedVoucher.discountAmount || 0;
  }, [appliedVoucher, totalShippingFee]);

  const grandTotal = Math.max(0, itemsSubtotal + totalShippingFee - discountAmount);

  // --- 10. Process Checkout Submission ---
  const handleSubmitOrder = async () => {
    if (!selectedAddress) {
      return toast.warning('Chú ý', 'Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
    }

    if (selectedAddress.isLegacy || !selectedAddress.districtId || !selectedAddress.wardCode) {
      toast.warning('Cần cập nhật địa chỉ', 'Hệ thống vận chuyển yêu cầu địa chỉ chuẩn có Tỉnh/Thành, Quận/Huyện, Phường/Xã. Vui lòng bấm "Thay đổi" để cập nhật địa chỉ chuẩn.');
      setShowAddressModal(true);
      setShowNewAddressForm(true);
      return;
    }

    if (paymentMethod === 'HAIPAY') {
      if (!walletInfo.isActive) {
        return toast.error('Lỗi', 'Bạn chưa kích hoạt Ví HaiPay. Vui lòng vào Kênh Ví để kích hoạt hoặc chọn phương thức khác.');
      }
      if (walletInfo.balance < grandTotal) {
        return toast.error('Số dư không đủ', `Số dư Ví (${formatPrice(walletInfo.balance)}) không đủ thanh toán ${formatPrice(grandTotal)}. Vui lòng nạp thêm hoặc chọn phương thức khác.`);
      }
    }

    setSubmitting(true);
    try {
      const checkoutPayload = {
        items: items.map((i) => ({
          productId: i.product?._id || i.productId || i._id,
          quantity: i.quantity
        })),
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          provinceId: selectedAddress.provinceId,
          provinceName: selectedAddress.provinceName,
          districtId: selectedAddress.districtId,
          districtName: selectedAddress.districtName,
          wardCode: selectedAddress.wardCode,
          wardName: selectedAddress.wardName,
          street: selectedAddress.street,
          fullAddress: selectedAddress.fullAddress || selectedAddress.street
        },
        saveAsDefault: false,
        paymentMethod
      };

      const { data } = await axiosClient.post('/api/checkout', checkoutPayload);

      // Clean checkout session items
      sessionStorage.removeItem('checkout_items');

      if (paymentMethod === 'VNPAY' && data.paymentUrl) {
        // Redirect to VNPAY Sandbox gateway
        toast.info('Đang chuyển hướng', 'Đang chuyển hướng sang cổng thanh toán VNPAY...');
        window.location.href = data.paymentUrl;
        return;
      }

      // COD or HAIPAY completed directly
      setOrderSuccess({
        parentOrderId: data.parentOrderId,
        amount: data.amount || grandTotal,
        orders: data.orders || [],
        paymentMethod
      });

      toast.success('Thành công', 'Đơn hàng của bạn đã được khởi tạo thành công!');
    } catch (err) {
      console.error('Lỗi đặt hàng:', err);
      toast.error('Lỗi đặt hàng', err.response?.data?.message || err.message || 'Không thể tạo đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render 11. Empty Items Fallback ---
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917] flex flex-col">
        <AppHeader />
        <main className="max-w-4xl mx-auto w-full px-4 py-20 flex-1 text-center">
          <div className="bg-white rounded-3xl p-12 border border-amber-200/60 shadow-sm max-w-lg mx-auto">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              🛒
            </div>
            <h2 className="text-2xl font-black text-stone-800 mb-2">Chưa có sản phẩm thanh toán</h2>
            <p className="text-stone-500 text-sm mb-6">
              Bạn chưa chọn sản phẩm nào từ giỏ hàng. Hãy quay lại kiểm tra giỏ hàng nhé.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/cart')}
                className="px-6 py-3 bg-[#FACC15] hover:bg-yellow-400 font-bold text-stone-900 rounded-xl transition shadow-sm"
              >
                Về Giỏ Hàng
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-6 py-3 bg-stone-100 hover:bg-stone-200 font-bold text-stone-700 rounded-xl transition"
              >
                Khám phá đồ cũ
              </button>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // --- Render 12. Order Success Screen (COD / HaiPay) ---
  if (orderSuccess) {
    return (
      <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917] flex flex-col">
        <AppHeader />
        <main className="max-w-2xl mx-auto w-full px-4 py-12 flex-1">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200 shadow-xl text-center animate-fade-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
              ✓
            </div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full uppercase tracking-wider mb-2">
              Đặt hàng thành công
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-800 mb-2">
              Cảm ơn bạn đã mua sắm tại HaiHand!
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              Mã giao dịch tổng: <strong className="text-stone-800 font-mono text-base">{orderSuccess.parentOrderId}</strong>
            </p>

            {/* Info summary */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 text-left space-y-3 mb-8 text-sm">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Hình thức thanh toán:</span>
                <span className="font-bold text-stone-800">
                  {orderSuccess.paymentMethod === 'HAIPAY'
                    ? 'Ví điện tử HaiPay (Đã trừ số dư)'
                    : 'Thanh toán khi nhận hàng (COD)'}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Số lượng kiện hàng (Nhà bán):</span>
                <span className="font-bold text-stone-800">{orderSuccess.orders?.length || groupedPackages.length} kiện hàng</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Tổng thanh toán:</span>
                <span className="font-black text-amber-600 text-base">{formatPrice(orderSuccess.amount)}</span>
              </div>
              <div className="pt-1">
                <span className="text-stone-500 block mb-1">Địa chỉ giao nhận:</span>
                <span className="font-medium text-stone-700 block bg-white p-3 rounded-xl border border-stone-200">
                  📍 <strong>{selectedAddress?.fullName}</strong> ({selectedAddress?.phone}) — {selectedAddress?.fullAddress || `${selectedAddress?.street}, ${selectedAddress?.wardName}, ${selectedAddress?.districtName}, ${selectedAddress?.provinceName}`}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Các nhà bán hàng sẽ được thông báo ngay lập tức để đóng gói và bàn giao cho đơn vị vận chuyển. Bạn có thể kiểm tra lộ trình chi tiết trong mục Đơn hàng.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/profile?tab=orders_buy')}
                className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                📦 Xem Đơn Mua
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#FACC15] hover:bg-yellow-400 text-stone-900 font-bold rounded-xl transition shadow-md"
              >
                Tiếp tục mua hàng
              </button>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // --- Render 13. Main Checkout Flow ---
  return (
    <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917] flex flex-col">
      <AppHeader />

      <main className="max-w-[1240px] mx-auto w-full px-4 py-6 sm:py-8 flex-1">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
          <Link to="/" className="hover:text-stone-900 flex items-center gap-1">
            Trang chủ
          </Link>
          <span>›</span>
          <Link to="/cart" className="hover:text-stone-900">
            Giỏ hàng
          </Link>
          <span>›</span>
          <span className="text-stone-900 font-bold">Thanh toán đơn hàng</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ================= LEFT COLUMN: DETAILS ================= */}
          <div className="w-full lg:w-[65%] space-y-6">

            {/* --- SECTION 1: DELIVERY ADDRESS --- */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs relative overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 absolute top-0 left-0 right-0" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    📍
                  </div>
                  <h2 className="text-lg font-black text-stone-800">Địa chỉ nhận hàng</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(true);
                    setShowNewAddressForm(false);
                  }}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-full transition flex items-center gap-1"
                >
                  <i className="fas fa-exchange-alt"></i> Thay đổi địa chỉ
                </button>
              </div>

              {loadingAddress ? (
                <div className="py-4 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
                  Đang tải thông tin địa chỉ...
                </div>
              ) : selectedAddress ? (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-extrabold text-stone-900 text-base">{selectedAddress.fullName}</span>
                    <span className="text-stone-400">|</span>
                    <span className="font-semibold text-stone-700">{selectedAddress.phone}</span>
                    {selectedAddress.isDefault && (
                      <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {selectedAddress.fullAddress ||
                      `${selectedAddress.street}, ${selectedAddress.wardName || ''}, ${selectedAddress.districtName || ''}, ${selectedAddress.provinceName || ''}`}
                  </p>
                  {selectedAddress.isLegacy && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-100/80 p-2 rounded-lg flex items-center gap-1.5">
                      <span>⚠️ Địa chỉ cũ chưa có chuẩn Quận/Huyện/Phường. Vui lòng bấm "Thay đổi" để chọn địa chỉ chuẩn tính phí vận chuyển chính xác.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-center">
                  <p className="text-sm text-stone-500 mb-3">Bạn chưa có địa chỉ nhận hàng nào được lưu.</p>
                  <button
                    onClick={() => {
                      setShowAddressModal(true);
                      setShowNewAddressForm(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    + Thêm địa chỉ nhận hàng
                  </button>
                </div>
              )}
            </div>

            {/* --- SECTION 2: MULTI-VENDOR ITEM GROUPS (Sub-Orders) --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                  <span>Kiện hàng theo Nhà bán ({groupedPackages.length} gian hàng)</span>
                </h2>
                <span className="text-xs font-semibold text-stone-500">
                  Mỗi nhà bán sẽ đóng gói và giao riêng biệt
                </span>
              </div>

              {groupedPackages.map((pkg, idx) => {
                const quote = shippingQuotes[pkg.sellerId];
                const pkgSubtotal = pkg.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const pkgFee = quote?.fee !== undefined ? quote.fee : 25000;

                return (
                  <div
                    key={pkg.sellerId}
                    className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden"
                  >
                    {/* Package Header: Shop Identity */}
                    <div className="px-6 py-4 bg-stone-50 border-b border-stone-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center font-bold text-xs text-amber-800 shrink-0">
                          {pkg.shopAvatar ? (
                            <img src={getImageUrl(pkg.shopAvatar)} alt="Shop" className="w-full h-full object-cover" />
                          ) : (
                            pkg.shopName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 text-sm">{pkg.shopName}</span>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Kiện #{idx + 1}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1">
                            📍 Kho xuất: {pkg.shopAddress}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-stone-500 hidden sm:inline">
                        {pkg.items.length} món
                      </span>
                    </div>

                    {/* Package Items List */}
                    <div className="p-6 divide-y divide-stone-100">
                      {pkg.items.map((item, itemIdx) => {
                        const img = (item.product.images && item.product.images[0]) || item.product.image;
                        return (
                          <div key={itemIdx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                            <img
                              src={getImageUrl(img)}
                              alt={item.product.title || item.product.name}
                              className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-stone-800 text-sm line-clamp-1">
                                {item.product.title || item.product.name}
                              </h4>
                              <p className="text-xs text-stone-400 mt-0.5">
                                Khối lượng ước tính: {item.product.weight || 500}g
                              </p>
                              <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                                <span>{formatPrice(item.price)}</span>
                                <span>×</span>
                                <span className="font-bold text-stone-700">{item.quantity}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-stone-900 text-sm">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dynamic Carrier Shipping Quote Box for this Seller Group */}
                    <div className="px-6 py-4 bg-amber-50/50 border-t border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                          🚚
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800">
                              {quote?.carrier || 'HaiHand Express (Tiêu chuẩn)'}
                            </span>
                            <span className="text-[10px] bg-white border border-amber-200 text-amber-700 px-1.5 py-0.2 rounded font-semibold">
                              {quote?.provider === 'ghn' ? 'GHN Official' : 'Vận chuyển B2C'}
                            </span>
                          </div>
                          <span className="text-stone-500 text-[11px]">
                            Thời gian giao dự kiến: {quote?.expectedDeliveryTime || '2-4 ngày làm việc'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                        <div className="text-stone-500">
                          Phí vận chuyển:{' '}
                          {quote?.loading ? (
                            <span className="text-stone-400 animate-pulse">Đang tính...</span>
                          ) : (
                            <strong className="text-stone-900 font-extrabold">{formatPrice(pkgFee)}</strong>
                          )}
                        </div>
                        <div className="text-stone-400 text-[11px]">
                          Tổng kiện: <strong className="text-amber-800">{formatPrice(pkgSubtotal + pkgFee)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* --- SECTION 3: PAYMENT METHOD SELECTOR --- */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  💳
                </div>
                <h2 className="text-lg font-black text-stone-800">Phương thức thanh toán</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. VNPAY */}
                <label
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    paymentMethod === 'VNPAY'
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                        VNP
                      </span>
                      Cổng VNPAY
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="VNPAY"
                      checked={paymentMethod === 'VNPAY'}
                      onChange={() => setPaymentMethod('VNPAY')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    Quét VNPAY-QR, Thẻ ATM nội địa hoặc thẻ Quốc tế (Visa/Mastercard).
                  </p>
                </label>

                {/* 2. HAIPAY WALLET */}
                <label
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    paymentMethod === 'HAIPAY'
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-amber-500 text-stone-900 text-xs font-black flex items-center justify-center">
                        👛
                      </span>
                      Ví HaiPay
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="HAIPAY"
                      checked={paymentMethod === 'HAIPAY'}
                      onChange={() => setPaymentMethod('HAIPAY')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-500 leading-normal mb-1">
                      Thanh toán tức thì bằng số dư ví HaiPay của bạn.
                    </p>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      Số dư: {formatPrice(walletInfo.balance)}
                    </span>
                  </div>
                </label>

                {/* 3. COD */}
                <label
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    paymentMethod === 'COD'
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                        💵
                      </span>
                      Thu hộ (COD)
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    Thanh toán tiền mặt cho shipper khi nhận được hàng tận tay.
                  </p>
                </label>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: ORDER SUMMARY (STICKY) ================= */}
          <div className="w-full lg:w-[35%] lg:sticky lg:top-24 space-y-4">
            
            {/* Voucher Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
              <label className="block text-xs font-bold text-stone-700 mb-2">
                🎟️ Khuyến mãi & Mã giảm giá
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mã voucher (vd: FREESHIP)"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:border-amber-500 uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl transition"
                >
                  Áp dụng
                </button>
              </div>

              {appliedVoucher && (
                <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center justify-between">
                  <span>✓ {appliedVoucher.label}</span>
                  <button
                    onClick={() => {
                      setAppliedVoucher(null);
                      setVoucherCode('');
                    }}
                    className="text-stone-400 hover:text-stone-600 font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {voucherError && (
                <p className="mt-2 text-xs text-red-500 font-medium">{voucherError}</p>
              )}
            </div>

            {/* Total Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-md space-y-4">
              <h3 className="text-base font-black text-stone-800 pb-3 border-b border-stone-100">
                Thông tin thanh toán
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Tiền hàng ({items.reduce((s, i) => s + (i.quantity || 1), 0)} món):</span>
                  <span className="font-bold text-stone-800">{formatPrice(itemsSubtotal)}</span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Phí vận chuyển ({groupedPackages.length} kiện):</span>
                  <span className="font-bold text-stone-800">{formatPrice(totalShippingFee)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Giảm giá:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="font-black text-stone-900 text-sm block">Tổng thanh toán:</span>
                    <span className="text-[10px] text-stone-400">Đã bao gồm VAT & Phí dịch vụ</span>
                  </div>
                  <span className="text-2xl font-black text-amber-600">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full py-4 bg-[#FACC15] hover:bg-yellow-400 active:bg-yellow-500 text-stone-900 font-black text-base rounded-2xl transition-all shadow-md shadow-amber-300/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                    <span>Đang xử lý đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <span>ĐẶT HÀNG NGAY</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* HaiHand Trust Guarantees */}
              <div className="pt-2 border-t border-stone-100 space-y-2 text-[11px] text-stone-500">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-xs">✓</span>
                  <span><strong>HaiHand Care:</strong> Hoàn tiền 100% nếu hàng không đúng mô tả.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-xs">🛡️</span>
                  <span>Đồng kiểm cùng Shipper khi nhận kiện hàng.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold text-xs">🔒</span>
                  <span>Thanh toán bảo mật tuyệt đối qua VNPAY & Ví HaiPay.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ================= MODAL: SELECT OR ADD NEW ADDRESS ================= */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="text-lg font-black text-stone-800">
                {showNewAddressForm ? 'Thêm địa chỉ nhận hàng mới' : 'Chọn địa chỉ nhận hàng'}
              </h3>
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setShowNewAddressForm(false);
                }}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {!showNewAddressForm ? (
              /* Address List View */
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <p className="text-sm text-stone-500 py-6 text-center">Chưa có địa chỉ nào được lưu.</p>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = selectedAddress?._id === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => {
                          setSelectedAddress(addr);
                          setShowAddressModal(false);
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-stone-900 text-sm">{addr.fullName}</span>
                          <span className="text-xs font-semibold text-stone-600">{addr.phone}</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {addr.fullAddress || `${addr.street}, ${addr.wardName}, ${addr.districtName}, ${addr.provinceName}`}
                        </p>
                        {addr.isDefault && (
                          <span className="inline-block mt-2 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            Mặc định
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="w-full py-3 border-2 border-dashed border-amber-400 text-amber-800 bg-amber-50/60 hover:bg-amber-100/70 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 mt-4"
                >
                  <span>+ Thêm địa chỉ mới</span>
                </button>
              </div>
            ) : (
              /* New Address Form with Cascading Master Data Dropdowns */
              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newAddr.fullName}
                      onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={newAddr.phone}
                      onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Cascading 3 Dropdowns */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tỉnh / Thành phố <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAddr.provinceId}
                    onChange={handleProvinceChange}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500"
                  >
                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                    {provinces.map((p) => (
                      <option key={p.ProvinceID} value={p.ProvinceID}>
                        {p.ProvinceName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Quận / Huyện <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!newAddr.provinceId}
                      value={newAddr.districtId}
                      onChange={handleDistrictChange}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500 disabled:opacity-50"
                    >
                      <option value="">-- Chọn Quận/Huyện --</option>
                      {districts.map((d) => (
                        <option key={d.DistrictID} value={d.DistrictID}>
                          {d.DistrictName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Phường / Xã <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!newAddr.districtId}
                      value={newAddr.wardCode}
                      onChange={handleWardChange}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500 disabled:opacity-50"
                    >
                      <option value="">-- Chọn Phường/Xã --</option>
                      {wards.map((w) => (
                        <option key={w.WardCode} value={w.WardCode}>
                          {w.WardName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Số nhà, tên đường <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 123 Đường Nguyễn Huệ"
                    value={newAddr.street}
                    onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveDefaultCheck"
                    checked={newAddr.isDefault}
                    onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="saveDefaultCheck" className="text-xs font-medium text-stone-700 cursor-pointer">
                    Đặt làm địa chỉ nhận hàng mặc định
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
