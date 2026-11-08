import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const AboutPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Giới thiệu HaiHand</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed">
            <p className="text-lg font-medium text-center">
              HaiHand Marketplace - Nền tảng kết nối mua bán đồ cũ uy tín, tiện lợi và hướng tới phát triển bền vững tại Việt Nam.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-stone-50 p-6 rounded-2xl">
                <h3 className="font-bold text-xl text-[#EA580C] mb-3 flex items-center gap-2">🎯 Sứ mệnh</h3>
                <p>Khơi dậy vòng đời mới cho mọi vật dụng. Chúng tôi tin rằng mỗi món đồ cũ đều mang một giá trị riêng và xứng đáng tìm được người chủ mới thay vì bị lãng phí.</p>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl">
                <h3 className="font-bold text-xl text-[#EA580C] mb-3 flex items-center gap-2">👁️ Tầm nhìn</h3>
                <p>Trở thành sàn giao dịch đồ cũ C2C lớn nhất Đông Nam Á, nơi mọi người có thể mua bán an toàn, nhanh chóng chỉ với vài cú chạm.</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold text-[#1C1917] mb-4">Tại sao chọn HaiHand?</h2>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C] font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-[#1C1917]">Giao dịch an toàn với ví HaiPay</h4>
                    <p className="text-sm">Tiền của bạn được giữ an toàn trên hệ thống cho đến khi bạn xác nhận đã nhận đúng món hàng.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C] font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-[#1C1917]">Cộng đồng minh bạch</h4>
                    <p className="text-sm">Hệ thống đánh giá, xếp hạng và xác thực danh tính người dùng giúp bạn an tâm tuyệt đối khi giao dịch.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C] font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-[#1C1917]">Bảo vệ môi trường</h4>
                    <p className="text-sm">Mua đồ cũ là một trong những cách thiết thực nhất để giảm thiểu lượng khí thải carbon và rác thải công nghiệp.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default AboutPage;
