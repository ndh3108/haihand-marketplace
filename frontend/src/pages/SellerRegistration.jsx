import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient, { persistUser } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { AppFooter } from '../components/AppFooter';

export default function SellerRegistration() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshProfile } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    shopName: '',
    phone: '',
    address: '',
    taxCode: '',
    description: '',
    agreeTerms: true
  });

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        shopName: prev.shopName || user.shopInfo?.shopName || (user.name ? `${user.name}'s Shop` : ''),
        phone: prev.phone || user.shopInfo?.phone || user.phone || '',
        address: prev.address || user.shopInfo?.address || user.address || '',
        taxCode: prev.taxCode || user.shopInfo?.taxCode || user.taxId || '',
        description: prev.description || user.shopInfo?.description || ''
      }));
    }
  }, [user]);

  const isApprovedSeller = user?.isSeller === true && user?.sellerStatus === 'approved';
  const isPendingSeller = user?.sellerStatus === 'pending';
  const isRejectedSeller = user?.sellerStatus === 'rejected';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.warning('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để nộp hồ sơ mở Shop!');
      navigate('/login');
      return;
    }

    if (!form.shopName.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập Tên Gian Hàng.');
      return;
    }
    if (!form.phone.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập Số điện thoại hotline CSKH.');
      return;
    }
    if (!form.address.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập Địa chỉ kho hàng xuất & đổi trả.');
      return;
    }
    if (!form.agreeTerms) {
      toast.warning('Điều khoản', 'Vui lòng xác nhận đồng ý với Quy chế hoạt động sàn HaiHand.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axiosClient.post('/api/users/apply-seller', {
        shopInfo: {
          shopName: form.shopName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          taxCode: form.taxCode.trim(),
          description: form.description.trim()
        }
      });

      if (data.user) {
        persistUser(data.user);
      }
      await refreshProfile();
      toast.success('Nộp hồ sơ thành công!', data.message || 'Hồ sơ mở Shop B2C đã được gửi tới Ban Quản Trị HaiHand.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error('Lỗi nộp hồ sơ', error.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ đăng ký.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-[#1C1917] font-sans flex flex-col justify-between">
      {/* Top Merchant Navigation */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200/80 shadow-xs">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="HaiHand" className="h-9 w-auto object-contain" />
            </Link>
            <div className="h-6 w-px bg-stone-200 hidden sm:block"></div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
              <i className="fas fa-certificate text-amber-600"></i> Kênh Đăng Ký Người Bán B2C
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-arrow-left text-[11px]"></i> Quay lại sàn mua sắm
            </Link>

            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-stone-200">
                <img 
                  src={user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full object-cover border border-amber-300" 
                />
                <span className="text-xs font-bold text-stone-800 hidden md:inline">{user.name}</span>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-1.5 rounded-lg bg-[#1C1917] hover:bg-stone-800 text-white text-xs font-bold transition-colors"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 shadow-2xs">
            <i className="fas fa-rocket text-orange-500"></i> HaiHand Multi-Vendor Platform
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-[#1C1917]">
            Mở Gian Hàng B2C — Tiếp Cận <span className="text-orange-600 underline decoration-amber-400 decoration-wavy">Hàng Triệu</span> Khách Hàng
          </h1>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Hệ sinh thái thương mại điện tử chuyên nghiệp dành cho Nhà phân phối, Cửa hàng và Thương hiệu. Bảo chứng dòng tiền qua <strong>HaiPay</strong> và tối ưu hóa chi phí vận hành.
          </p>
        </div>

        {/* 4 Merchant Pillars / Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl font-bold shadow-2xs">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h4 className="font-bold text-base text-[#1C1917]">Dòng Tiền HaiPay</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Giải ngân tự động sau khi giao hàng thành công. Không lo rủi ro bùng hàng hay chậm hoàn tiền.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shadow-2xs">
              <i className="fas fa-boxes"></i>
            </div>
            <h4 className="font-bold text-base text-[#1C1917]">Quản Lý Biến Thể</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Thiết lập danh mục sản phẩm đa SKU, màu sắc, tình trạng máy (99%, Fullbox) và kho hàng thông minh.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold shadow-2xs">
              <i className="fas fa-percentage"></i>
            </div>
            <h4 className="font-bold text-base text-[#1C1917]">Phí Sàn Cực Ưu Đãi</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Chỉ từ 5% trên đơn thành công. Miễn phí 100% phí đăng ký, mở gian hàng và phí duy trì thường niên.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold shadow-2xs">
              <i className="fas fa-bullhorn"></i>
            </div>
            <h4 className="font-bold text-base text-[#1C1917]">Tiếp Cận Toàn Quốc</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Sản phẩm hiển thị trực quan tới hơn 50.000 khách mua tìm kiếm đồ điện tử, công nghệ mỗi ngày.
            </p>
          </div>
        </div>

        {/* 3 Step Process Overview */}
        <div className="bg-amber-100/60 border border-amber-200/80 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xs">
          <h3 className="text-center font-black text-lg text-amber-950 mb-6">
            Quy Trình 3 Bước Trở Thành Đối Tác B2C
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#1C1917] text-[#FACC15] font-black flex items-center justify-center shadow-xs">
                1
              </div>
              <h5 className="font-bold text-sm text-[#1C1917]">Điền Hồ Sơ Shop</h5>
              <p className="text-xs text-stone-600">Cung cấp tên thương hiệu, địa chỉ kho xuất hàng và hotline hỗ trợ.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white font-black flex items-center justify-center shadow-xs">
                2
              </div>
              <h5 className="font-bold text-sm text-[#1C1917]">Thẩm Định Nhanh 24H</h5>
              <p className="text-xs text-stone-600">Admin xét duyệt thông tin pháp lý và tính xác thực của kho hàng.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shadow-xs">
                3
              </div>
              <h5 className="font-bold text-sm text-[#1C1917]">Bắt Đầu Bán Hàng</h5>
              <p className="text-xs text-stone-600">Mở khóa Kênh Người Bán B2C, đăng tải danh mục sản phẩm và đón nhận đơn hàng.</p>
            </div>
          </div>
        </div>

        {/* Central Card: Status OR Form */}
        <div className="max-w-3xl mx-auto">
          {!user ? (
            /* CASE 0: GUEST NOT LOGGED IN */
            <div className="bg-white rounded-2xl border border-stone-200 p-8 md:p-12 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-xs">
                <i className="fas fa-user-lock"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#1C1917]">Vui Lòng Đăng Nhập Để Tiếp Tục</h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto">
                  Để đảm bảo tính xác thực và an toàn cho sàn thương mại điện tử, bạn cần có tài khoản HaiHand trước khi đăng ký mở gian hàng.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold text-sm rounded-xl shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i> Đăng Nhập Ngay
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm rounded-xl transition-colors"
                >
                  Tạo Tài Khoản Mới
                </Link>
              </div>
            </div>
          ) : isApprovedSeller ? (
            /* CASE 1: ALREADY APPROVED B2C MERCHANT */
            <div className="bg-gradient-to-br from-white to-orange-50/50 rounded-2xl border-2 border-orange-200 p-8 md:p-12 text-center shadow-sm space-y-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-md shadow-orange-500/20">
                <i className="fas fa-store"></i>
              </div>
              <div className="space-y-2">
                <span className="inline-block px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  ✓ Đối Tác Chính Thức B2C
                </span>
                <h3 className="text-2xl font-black text-slate-800">
                  Gian Hàng "{user.shopInfo?.shopName || user.name}" Đang Hoạt Động!
                </h3>
                <p className="text-sm text-slate-500 max-w-lg mx-auto">
                  Tài khoản của bạn đã được cấp quyền quản trị Nhà Bán Hàng B2C. Bạn có thể truy cập ngay Kênh Người Bán để thiết lập sản phẩm, quản lý kho và xử lý đơn hàng.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/seller-channel')}
                  className="px-10 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-102 inline-flex items-center gap-2"
                >
                  <i className="fas fa-tachometer-alt"></i> Vào Kênh Người Bán Ngay
                </button>
              </div>
            </div>
          ) : isPendingSeller ? (
            /* CASE 2: PENDING APPROVAL */
            <div className="bg-white rounded-2xl border border-amber-300 p-8 md:p-10 shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-xs">
                  <i className="fas fa-clock fa-spin"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Trạng thái hồ sơ</span>
                  <h3 className="text-2xl font-black text-slate-800">Đơn đăng ký đang được thẩm định ⏳</h3>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 leading-relaxed">
                Hồ sơ mở Shop B2C của bạn đã được tiếp nhận và đang trong hàng đợi thẩm định của Ban Quản Trị HaiHand. 
                Thời gian xử lý thông thường trong vòng <strong>24 giờ làm việc</strong>. Khi được kích hoạt, bạn sẽ nhận được thông báo tự động và có thể truy cập Kênh Người Bán ngay.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Tên Gian Hàng</span>
                  <span className="font-bold text-slate-800 text-sm">{user.shopInfo?.shopName || user.name}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Hotline CSKH</span>
                  <span className="font-bold text-slate-800 text-sm">{user.shopInfo?.phone || user.phone}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Ngày nộp đơn</span>
                  <span className="font-bold text-slate-800 text-sm">{user.sellerAppliedAt ? new Date(user.sellerAppliedAt).toLocaleDateString('vi-VN') : 'Hôm nay'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* CASE 3: NEW REGISTRATION OR REJECTED RESUBMISSION */
            <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-10 shadow-sm space-y-6">
              {isRejectedSeller && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-rose-500 text-lg mt-0.5 shrink-0"></i>
                  <div>
                    <strong className="block font-bold">Hồ sơ trước đó chưa đủ điều kiện:</strong>
                    <p className="mt-1">{user.sellerRejectionReason || 'Thông tin cung cấp chưa đầy đủ hoặc địa chỉ kho hàng chưa xác thực.'}</p>
                    <span className="block mt-1 font-semibold text-rose-700">Vui lòng cập nhật lại thông tin chính xác bên dưới và nộp lại hồ sơ:</span>
                  </div>
                </div>
              )}

              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-2xl font-black text-[#1C1917] flex items-center gap-2">
                  <i className="fas fa-store-alt text-orange-500"></i>
                  {isRejectedSeller ? 'Cập Nhật Hồ Sơ Người Bán B2C' : 'Đăng Ký Mở Gian Hàng B2C'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Điền các thông tin cơ bản về gian hàng để Ban Quản Trị xem xét và kích hoạt Kênh Người Bán.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Tên Gian Hàng (Shop Name) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Hải Hand Audio Store, TechZone..."
                      value={form.shopName}
                      onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-semibold transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Hotline CSKH / Số Điện Thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 0901234567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Địa Chỉ Kho Hàng Xuất & Đổi Trả <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium transition-colors"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Địa chỉ kho dùng để đối tác vận chuyển tới lấy hàng khi có đơn phát sinh.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Mã Số Thuế Doanh Nghiệp / Số CCCD Định Danh
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0314892182 hoặc 079201004123"
                    value={form.taxCode}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-mono transition-colors"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Hỗ trợ chứng từ thuế VAT và tăng mức độ uy tín cho gian hàng của bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Mô Tả Định Hướng Kinh Doanh & Nguồn Hàng
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Các nhóm mặt hàng dự kiến phân phối (Điện thoại cũ, Laptop likenew, Âm thanh...), xuất xứ hàng hóa..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium transition-colors"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-600 font-medium">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-orange-500 rounded border-stone-300 focus:ring-orange-500"
                    />
                    <span>
                      Tôi xác nhận thông tin trên là chính xác và cam kết tuân thủ đầy đủ <Link to="/terms" target="_blank" className="text-orange-600 underline font-bold">Quy chế hoạt động sàn HaiHand</Link> cùng <Link to="/fee-structure" target="_blank" className="text-orange-600 underline font-bold">Biểu phí B2C</Link>.
                    </span>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-base rounded-xl shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Đang Gửi Hồ Sơ...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i> Gửi Hồ Sơ Đăng Ký Mở Shop B2C
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Support Section */}
        <div className="max-w-3xl mx-auto bg-stone-900 text-white p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="font-bold text-base text-amber-400 mb-1">Cần Tư Vấn Riêng Cho Doanh Nghiệp?</h4>
            <p className="text-xs text-stone-300">Đội ngũ Merchant Success luôn sẵn sàng hỗ trợ onboarding trong vòng 15 phút.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a 
              href="tel:0934332300" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <i className="fas fa-phone-alt text-amber-400"></i> (+84) 934 332 300
            </a>
            <a 
              href="mailto:trietle3105@gmail.com" 
              className="px-4 py-2 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <i className="fas fa-envelope"></i> Gửi Email
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
