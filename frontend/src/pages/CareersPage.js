import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const CareersPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Tuyển dụng</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">Gia nhập đội ngũ HaiHand</h2>
            <p className="text-stone-600">Chúng tôi luôn tìm kiếm những con người đam mê, sáng tạo và chung chí hướng xây dựng nền tảng thương mại bền vững.</p>
          </div>

          <div className="space-y-6">
            <div className="p-6 border border-stone-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-bold text-lg text-[#EA580C]">Senior Frontend Engineer (React/Tailwind)</h3>
                <p className="text-sm text-stone-500 mt-1">Phòng IT • Toàn thời gian • TP. Hồ Chí Minh</p>
              </div>
              <button className="px-5 py-2 bg-[#1C1917] text-white font-bold rounded-full text-sm hover:bg-stone-800">Ứng tuyển ngay</button>
            </div>
            
            <div className="p-6 border border-stone-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-bold text-lg text-[#EA580C]">Chuyên viên CSKH Khách Hàng (Full-time)</h3>
                <p className="text-sm text-stone-500 mt-1">Phòng CSKH • Toàn thời gian • Làm việc từ xa</p>
              </div>
              <button className="px-5 py-2 bg-[#1C1917] text-white font-bold rounded-full text-sm hover:bg-stone-800">Ứng tuyển ngay</button>
            </div>
            
            <div className="p-6 border border-stone-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-bold text-lg text-[#EA580C]">Nhân viên Marketing Content (Intern)</h3>
                <p className="text-sm text-stone-500 mt-1">Phòng Marketing • Bán thời gian • TP. Hà Nội</p>
              </div>
              <button className="px-5 py-2 bg-[#1C1917] text-white font-bold rounded-full text-sm hover:bg-stone-800">Ứng tuyển ngay</button>
            </div>
          </div>
          
          <div className="mt-12 text-center text-sm text-stone-500">
            Không tìm thấy vị trí phù hợp? Gửi CV của bạn về <a href="mailto:hr@haihand.vn" className="text-[#EA580C] font-bold">hr@haihand.vn</a>. Chúng tôi sẽ liên hệ khi có cơ hội.
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default CareersPage;
