import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const DisputeResolutionPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Quy trình giải quyết tranh chấp</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <p className="text-center font-medium">HaiHand đề cao sự thỏa thuận tự nguyện giữa Người Mua và Người Bán. Tuy nhiên, trong trường hợp không thể tự giải quyết, Ban Quản Trị sẽ can thiệp theo quy trình sau:</p>
            
            <div className="relative border-l-2 border-orange-200 ml-3 md:ml-6 space-y-10 py-4">
              <div className="relative pl-8">
                <div className="absolute w-6 h-6 bg-[#EA580C] rounded-full text-white flex items-center justify-center font-bold text-xs -left-[13px] top-0 ring-4 ring-white">1</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Tiếp nhận khiếu nại</h3>
                <p>Người dùng gửi khiếu nại qua tính năng "Báo cáo" trên ứng dụng hoặc gọi Hotline 1900 1234. Yêu cầu cung cấp đầy đủ bằng chứng (hình ảnh, video mở hộp, tin nhắn thỏa thuận).</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute w-6 h-6 bg-[#EA580C] rounded-full text-white flex items-center justify-center font-bold text-xs -left-[13px] top-0 ring-4 ring-white">2</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Đóng băng giao dịch</h3>
                <p>Đối với các đơn hàng thanh toán qua ví HaiPay, số tiền giao dịch sẽ tạm thời bị đóng băng cho đến khi tranh chấp được giải quyết xong.</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute w-6 h-6 bg-[#EA580C] rounded-full text-white flex items-center justify-center font-bold text-xs -left-[13px] top-0 ring-4 ring-white">3</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Phân tích và đối chất</h3>
                <p>Ban Quản Trị HaiHand sẽ liên hệ với cả hai bên để xác minh thông tin. Quá trình này có thể mất từ 3 - 7 ngày làm việc tùy mức độ phức tạp.</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute w-6 h-6 bg-[#EA580C] rounded-full text-white flex items-center justify-center font-bold text-xs -left-[13px] top-0 ring-4 ring-white">4</div>
                <h3 className="font-bold text-[#1C1917] text-lg mb-2">Đưa ra phán quyết</h3>
                <p>Dựa trên bằng chứng, HaiHand sẽ đưa ra phán quyết cuối cùng (hoàn tiền cho người mua, thanh toán cho người bán, hoặc các biện pháp xử phạt tài khoản vi phạm).</p>
              </div>
            </div>
            
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm mt-8">
              <strong>Lưu ý quan trọng:</strong> HaiHand sẽ TỪ CHỐI giải quyết tranh chấp nếu người mua đã bấm "Đã nhận được hàng" hoặc giao dịch được thực hiện bằng tiền mặt không qua hệ thống kiểm soát của sàn.
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default DisputeResolutionPage;
