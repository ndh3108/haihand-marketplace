import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const CommunityStandardsPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Tiêu chuẩn cộng đồng</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <p>Để xây dựng một môi trường mua bán đồ cũ văn minh, thân thiện và an toàn, tất cả thành viên trên HaiHand cần tuân thủ các tiêu chuẩn sau:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-stone-200 p-6 rounded-2xl hover:border-orange-200 transition-colors">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Tôn trọng lẫn nhau</h3>
                <p>Giao tiếp lịch sự, không sử dụng ngôn từ xúc phạm, đe dọa, hoặc phân biệt đối xử trong phần bình luận và tin nhắn.</p>
              </div>
              <div className="border border-stone-200 p-6 rounded-2xl hover:border-orange-200 transition-colors">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Trung thực tuyệt đối</h3>
                <p>Chỉ đăng bán những món đồ bạn đang sở hữu. Mô tả chính xác tình trạng, lỗi (nếu có) của sản phẩm. Không sử dụng ảnh mạng giả mạo.</p>
              </div>
              <div className="border border-stone-200 p-6 rounded-2xl hover:border-orange-200 transition-colors">
                <div className="text-3xl mb-3">🚫</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Không hàng giả, hàng cấm</h3>
                <p>Nghiêm cấm buôn bán vũ khí, chất kích thích, động vật hoang dã, hàng giả mạo thương hiệu và các mặt hàng vi phạm pháp luật.</p>
              </div>
              <div className="border border-stone-200 p-6 rounded-2xl hover:border-orange-200 transition-colors">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Bảo vệ an toàn</h3>
                <p>Không chia sẻ thông tin thẻ tín dụng, mật khẩu ngân hàng qua khung chat. Tránh hẹn giao dịch trực tiếp ở những nơi vắng vẻ.</p>
              </div>
            </div>
            
            <div className="mt-8 bg-stone-50 p-6 rounded-2xl text-center">
              <p className="font-bold text-[#EA580C] mb-2">Hình thức xử lý vi phạm</p>
              <p className="text-sm">Tùy vào mức độ vi phạm, tài khoản có thể bị cảnh cáo, gỡ bài đăng, hoặc khóa vĩnh viễn không cần báo trước.</p>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default CommunityStandardsPage;
