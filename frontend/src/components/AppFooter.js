import React from 'react';
import { Link } from 'react-router-dom';

export const AppFooter = () => {
  return (
    <footer className="bg-white border-t border-[#E7E5E4] pt-12 pb-6 mt-12">
      <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Cột 1: Giới thiệu */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="HaiHand" className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-sm text-stone-500 leading-relaxed">
            Nền tảng thương mại điện tử đồ cũ C2C. Mua sắm an toàn, tiện lợi và tiết kiệm cho mọi nhà.
          </p>
          <div className="flex gap-4">
            <a href="/" className="text-stone-400 hover:text-[#1C1917]"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
            <a href="/" className="text-stone-400 hover:text-[#1C1917]"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
          </div>
        </div>

        {/* Cột 2: Chăm sóc khách hàng */}
        <div>
          <h4 className="font-semibold text-[#1C1917] mb-4">Chăm sóc khách hàng</h4>
          <ul className="space-y-2 text-sm text-stone-500">
            <li><Link to="/help-center" className="hover:text-[#EA580C]">Trung tâm trợ giúp</Link></li>
            <li><Link to="/safe-buying-guide" className="hover:text-[#EA580C]">Hướng dẫn mua đồ cũ an toàn</Link></li>
            <li><Link to="/dispute-resolution" className="hover:text-[#EA580C]">Quy trình giải quyết tranh chấp</Link></li>
            <li><Link to="/faq" className="hover:text-[#EA580C]">Câu hỏi thường gặp</Link></li>
          </ul>
        </div>

        {/* Cột 3: Về HaiHand */}
        <div>
          <h4 className="font-semibold text-[#1C1917] mb-4">Về HaiHand</h4>
          <ul className="space-y-2 text-sm text-stone-500">
            <li><Link to="/about" className="hover:text-[#EA580C]">Giới thiệu HaiHand</Link></li>
            <li><Link to="/careers" className="hover:text-[#EA580C]">Tuyển dụng</Link></li>
            <li><Link to="/community-standards" className="hover:text-[#EA580C]">Tiêu chuẩn cộng đồng</Link></li>
            <li><Link to="/environmental-impact" className="hover:text-[#EA580C]">Tác động môi trường</Link></li>
          </ul>
        </div>

        {/* Cột 4: Thanh toán */}
        <div>
          <h4 className="font-semibold text-[#1C1917] mb-4">Thanh toán & Vận chuyển</h4>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1 bg-stone-100 rounded text-xs font-semibold text-stone-600 border border-stone-200">VNPay</div>
            <div className="px-3 py-1 bg-[#FACC15]/20 rounded text-xs font-semibold text-[#854D0E] border border-[#FACC15]/50">Ví HaiPay</div>
            <div className="px-3 py-1 bg-stone-100 rounded text-xs font-semibold text-stone-600 border border-stone-200">COD</div>
          </div>
        </div>

        {/* Cột 5: Quy chế */}
        <div>
          <h4 className="font-semibold text-[#1C1917] mb-4">Quy chế sàn TMĐT</h4>
          <ul className="space-y-2 text-sm text-stone-500">
            <li><Link to="/terms" className="hover:text-[#EA580C]">Quy chế hoạt động</Link></li>
            <li><Link to="/privacy" className="hover:text-[#EA580C]">Chính sách bảo mật</Link></li>
            <li><Link to="/fee-structure" className="hover:text-[#EA580C]">Biểu phí minh bạch</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-[1200px] mx-auto px-4 mt-10 pt-6 border-t border-stone-100">
        <p className="text-xs text-stone-400 text-center">
          © 2025 HaiHand - Mua bán đồ cũ văn minh, tiết kiệm. Mã số doanh nghiệp: 0108992384.
        </p>
      </div>
    </footer>
  );
};
