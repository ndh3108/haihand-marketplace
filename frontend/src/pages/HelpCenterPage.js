import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const HelpCenterPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100 text-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Trung tâm trợ giúp</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full mb-6"></div>
            <p className="text-stone-600">Xin chào, chúng tôi có thể giúp gì cho bạn hôm nay?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-orange-200 transition-colors cursor-pointer">
              <h3 className="text-lg font-bold text-[#EA580C] mb-2">Tài khoản & Bảo mật</h3>
              <p className="text-sm text-stone-500">Quản lý mật khẩu, cập nhật hồ sơ, bảo vệ tài khoản khỏi lừa đảo.</p>
            </div>
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-orange-200 transition-colors cursor-pointer">
              <h3 className="text-lg font-bold text-[#EA580C] mb-2">Mua hàng</h3>
              <p className="text-sm text-stone-500">Cách tìm kiếm, đánh giá người bán, thanh toán qua HaiPay và nhận hàng an toàn.</p>
            </div>
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-orange-200 transition-colors cursor-pointer">
              <h3 className="text-lg font-bold text-[#EA580C] mb-2">Bán hàng</h3>
              <p className="text-sm text-stone-500">Cách chụp ảnh đẹp, định giá sản phẩm, quản lý đơn hàng và rút tiền.</p>
            </div>
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 hover:border-orange-200 transition-colors cursor-pointer">
              <h3 className="text-lg font-bold text-[#EA580C] mb-2">Ví HaiPay</h3>
              <p className="text-sm text-stone-500">Cách nạp tiền, rút tiền, biểu phí giao dịch và các lỗi thường gặp.</p>
            </div>
          </div>

          <div className="mt-12 p-8 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl">
            <h3 className="font-bold text-lg mb-2">Bạn vẫn cần hỗ trợ?</h3>
            <p className="text-stone-600 text-sm mb-6">Đội ngũ CSKH của HaiHand luôn sẵn sàng hỗ trợ bạn 24/7.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-[#1C1917] text-white font-bold rounded-full hover:bg-stone-800 transition-colors">Chat với CSKH</button>
              <button className="px-6 py-3 bg-white text-[#1C1917] border border-stone-200 font-bold rounded-full hover:bg-stone-50 transition-colors">Gọi Hotline: 1900 1234</button>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default HelpCenterPage;
