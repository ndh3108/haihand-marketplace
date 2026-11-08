import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const FAQPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Câu hỏi thường gặp</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-6 text-stone-600">
            <div className="border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#1C1917] mb-2">Làm sao để đảm bảo an toàn khi mua hàng?</h3>
              <p className="text-sm">Hãy kiểm tra kỹ phần đánh giá của người bán, thời gian tham gia sàn và ưu tiên sử dụng phương thức thanh toán qua ví HaiPay. Hạn chế chuyển tiền trực tiếp cho người lạ nếu họ không có uy tín cao trên hệ thống.</p>
            </div>
            
            <div className="border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#1C1917] mb-2">Tôi muốn hủy đơn hàng phải làm sao?</h3>
              <p className="text-sm">Nếu người bán chưa xác nhận gửi hàng, bạn có thể vào phần Quản lý đơn hàng và chọn "Hủy đơn". Nếu người bán đã gửi hàng, bạn cần liên hệ trực tiếp với người bán qua tính năng Chat để thỏa thuận.</p>
            </div>
            
            <div className="border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#1C1917] mb-2">Đăng tin trên HaiHand có mất phí không?</h3>
              <p className="text-sm">Hiện tại, việc đăng tin cơ bản trên HaiHand là HOÀN TOÀN MIỄN PHÍ. Tuy nhiên, nếu bạn muốn tin đăng của mình nổi bật (gắn nhãn, đẩy lên đầu trang), bạn có thể mua các gói dịch vụ trả phí.</p>
            </div>
            
            <div className="border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#1C1917] mb-2">Tôi nạp tiền vào ví HaiPay nhưng chưa thấy vào tài khoản?</h3>
              <p className="text-sm">Đôi khi hệ thống ngân hàng hoặc VNPay có độ trễ vài phút. Nếu sau 15 phút tài khoản vẫn chưa cập nhật, vui lòng chụp lại biên lai chuyển khoản và liên hệ tổng đài CSKH 1900 1234 để được hỗ trợ kiểm tra.</p>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default FAQPage;
