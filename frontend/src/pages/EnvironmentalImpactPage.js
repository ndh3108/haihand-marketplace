import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const EnvironmentalImpactPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Tác động môi trường</h1>
            <div className="w-16 h-1 bg-[#22C55E] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-center">
            <div className="bg-green-50 p-8 rounded-3xl mb-8">
              <h2 className="text-2xl font-bold text-green-800 mb-4">Mỗi giao dịch là một hành động xanh</h2>
              <p className="text-green-700">Khi bạn chọn mua hoặc bán một món đồ cũ trên HaiHand, bạn không chỉ tiết kiệm tiền mà còn đang trực tiếp giảm thiểu áp lực lên môi trường tự nhiên của chúng ta.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6">
                <div className="text-5xl mb-4">💧</div>
                <h3 className="font-bold text-lg text-[#1C1917] mb-2">Tiết kiệm nước</h3>
                <p className="text-sm">Để sản xuất một chiếc áo thun mới cần tới 2,700 lít nước. Mua đồ cũ giúp tiết kiệm hàng triệu lít nước sạch mỗi năm.</p>
              </div>
              <div className="p-6">
                <div className="text-5xl mb-4">🏭</div>
                <h3 className="font-bold text-lg text-[#1C1917] mb-2">Giảm khí thải Carbon</h3>
                <p className="text-sm">Giảm thiểu việc sản xuất công nghiệp mới đồng nghĩa với việc cắt giảm lượng lớn khí thải CO2 gây hiệu ứng nhà kính.</p>
              </div>
              <div className="p-6">
                <div className="text-5xl mb-4">🗑️</div>
                <h3 className="font-bold text-lg text-[#1C1917] mb-2">Hạn chế rác thải</h3>
                <p className="text-sm">Kéo dài vòng đời sản phẩm giúp giảm bớt lượng rác thải rắn khổng lồ bị chôn lấp hoặc đốt bỏ mỗi ngày.</p>
              </div>
            </div>
            
            <div className="mt-12 p-8 bg-stone-900 text-white rounded-3xl">
              <h3 className="text-xl font-bold mb-3">Chung tay cùng HaiHand</h3>
              <p className="text-stone-300 text-sm mb-6">Mục tiêu đến năm 2030, cộng đồng HaiHand sẽ giúp giảm thiểu 10,000 tấn rác thải tiêu dùng tại Việt Nam.</p>
              <button className="px-6 py-3 bg-[#22C55E] text-white font-bold rounded-full hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30">
                Bắt đầu bán đồ cũ ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default EnvironmentalImpactPage;
