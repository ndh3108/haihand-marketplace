import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const SafeBuyingGuidePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Hướng dẫn mua đồ cũ an toàn</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <p>Mua sắm đồ cũ giúp tiết kiệm chi phí nhưng cũng tiềm ẩn rủi ro nếu bạn không cẩn thận. Dưới đây là những "bí kíp" từ HaiHand giúp bạn luôn giao dịch an toàn.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-amber-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-amber-900 mb-2">1. Xem xét kỹ uy tín người bán</h3>
                <p className="text-amber-800 text-sm">Kiểm tra thời gian tham gia, sao đánh giá trung bình và đọc các bình luận từ người mua trước. Tuyệt đối cẩn thận với các tài khoản vừa mới tạo mà đăng bán đồ giá trị cao với giá rẻ bèo.</p>
              </div>
              <div className="bg-emerald-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-emerald-900 mb-2">2. Sử dụng Ví HaiPay</h3>
                <p className="text-emerald-800 text-sm">Giao dịch qua ví HaiPay đảm bảo tiền của bạn được hệ thống giữ hộ cho đến khi bạn xác nhận nhận hàng thành công và đúng mô tả.</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-blue-900 mb-2">3. Chat trực tiếp trên ứng dụng</h3>
                <p className="text-blue-800 text-sm">Mọi thỏa thuận, xin thêm ảnh/video chi tiết sản phẩm nên được thực hiện qua khung chat của HaiHand để có bằng chứng giải quyết khi xảy ra tranh chấp.</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-rose-900 mb-2">4. Kiểm tra kỹ hàng khi nhận</h3>
                <p className="text-rose-800 text-sm">Quay video quá trình mở hộp (unbox). Nếu hàng lỗi, vỡ, hoặc không đúng mô tả, đừng bấm "Đã nhận hàng". Hãy liên hệ ngay cho người bán hoặc HaiHand để xử lý.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default SafeBuyingGuidePage;
