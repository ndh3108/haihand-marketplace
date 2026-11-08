import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const FeeStructurePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Biểu phí minh bạch</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <p className="text-center font-medium">HaiHand cam kết duy trì một chính sách phí rõ ràng, không phí ẩn để mang lại lợi ích cao nhất cho cả người mua và người bán.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="border border-stone-200 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">0đ</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Đăng tin cơ bản</h3>
                <p>Miễn phí 100% đối với các tin đăng thông thường ở tất cả các danh mục. Bạn có thể đăng không giới hạn số lượng tin.</p>
              </div>
              <div className="border border-stone-200 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">0đ</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Mua hàng</h3>
                <p>Người mua không phải chịu bất kỳ khoản phụ phí nào từ nền tảng khi thanh toán hoặc nhận hàng.</p>
              </div>
              <div className="border border-orange-200 bg-orange-50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-orange-200 text-[#EA580C] rounded-full flex items-center justify-center font-bold text-lg mb-4">2%</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Phí giao dịch thanh toán</h3>
                <p>Áp dụng đối với Người Bán khi đơn hàng giao dịch thành công thông qua Ví HaiPay (phí xử lý giao dịch cổng thanh toán).</p>
              </div>
              <div className="border border-blue-200 bg-blue-50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-blue-200 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">★</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Dịch vụ đẩy tin (Tùy chọn)</h3>
                <p>Từ 10.000đ/lần. Giúp tin đăng của bạn nổi bật hơn và tiếp cận được nhiều khách hàng tiềm năng hơn.</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-stone-100 text-center">
              <p className="text-stone-500 text-sm">Các mức phí có thể thay đổi tùy theo chương trình khuyến mãi. Vui lòng theo dõi thông báo trên ứng dụng.</p>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default FeeStructurePage;
