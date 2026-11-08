import React, { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { isTrackingOptedOut, setTrackingOptOut } from '../utils/tracker';

const PrivacyPage = () => {
  const [optedOut, setOptedOut] = useState(() => isTrackingOptedOut());

  const handleToggleOptOut = (e) => {
    const isChecked = e.target.checked;
    setOptedOut(isChecked);
    setTrackingOptOut(isChecked);
  };
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Chính sách bảo mật</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <section>
              <p>
                Sự riêng tư của bạn là ưu tiên hàng đầu tại <strong className="text-[#EA580C]">HaiHand Marketplace</strong>. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng nền tảng của chúng tôi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">1</span>
                Thu thập thông tin
              </h2>
              <p className="mb-2">Chúng tôi có thể thu thập các thông tin sau từ bạn:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Thông tin cá nhân: Họ tên, số điện thoại, địa chỉ email, ảnh đại diện, địa chỉ nhận hàng.</li>
                <li>Thông tin giao dịch: Lịch sử mua bán, chi tiết đơn hàng, lịch sử nạp/rút tiền ví HaiPay.</li>
                <li>Thông tin thiết bị và cookie: Địa chỉ IP, loại trình duyệt, để cải thiện trải nghiệm người dùng.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">2</span>
                Sử dụng thông tin
              </h2>
              <p className="mb-2">Thông tin của bạn được sử dụng vào các mục đích:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Xác thực tài khoản và đảm bảo an toàn cho các giao dịch trên sàn.</li>
                <li>Hỗ trợ người mua và người bán kết nối, giao tiếp qua hệ thống chat nội bộ.</li>
                <li>Gửi thông báo về đơn hàng, tin nhắn mới, hoặc các chương trình khuyến mãi (nếu bạn đồng ý).</li>
                <li>Giải quyết tranh chấp và ngăn chặn các hành vi gian lận.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">3</span>
                Bảo vệ và chia sẻ thông tin
              </h2>
              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="font-bold text-[#1C1917] mb-1">Cam kết bảo mật</h3>
                  <p>Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức nghiêm ngặt để bảo vệ dữ liệu của bạn khỏi việc truy cập trái phép, mất mát hoặc phá hủy.</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="font-bold text-[#1C1917] mb-1">Chia sẻ cho bên thứ ba</h3>
                  <p>HaiHand KHÔNG bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích tiếp thị. Chúng tôi chỉ chia sẻ thông tin (như địa chỉ, số điện thoại) với các đối tác vận chuyển và thanh toán để thực hiện đơn hàng, hoặc khi có yêu cầu hợp pháp từ cơ quan pháp luật.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">4</span>
                Quyền lợi của bạn
              </h2>
              <p>Bạn có quyền truy cập, chỉnh sửa, hoặc yêu cầu xóa dữ liệu cá nhân của mình bất kỳ lúc nào thông qua phần "Chỉnh sửa hồ sơ" trong trang cá nhân, hoặc liên hệ trực tiếp với đội ngũ hỗ trợ của chúng tôi.</p>
            </section>

            <section className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 md:p-6 mt-6">
              <h2 className="text-xl font-bold text-[#1C1917] mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-900 text-sm font-bold">5</span>
                Phân tích hành vi & Cá nhân hóa gợi ý (Privacy & Opt-out)
              </h2>
              <p className="text-stone-700 text-sm md:text-base leading-relaxed mb-4">
                HaiHand sử dụng các tín hiệu tương tác ẩn danh (lượt xem sản phẩm, thời gian xem, tìm kiếm, giỏ hàng) để hiểu gu sở thích và gợi ý các món đồ phù hợp nhất cho bạn. 
                Chúng tôi <strong>tuyệt đối không lưu trữ thông tin cá nhân nhạy cảm</strong> (email, số điện thoại, mật khẩu, địa chỉ) trong các bản ghi hành vi này. Dữ liệu sự kiện được tự động xóa vĩnh viễn sau 90 ngày (TTL).
              </p>
              
              <div className="bg-white p-4 rounded-xl border border-stone-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm md:text-base">Tùy chọn Quyền riêng tư: Tắt thu thập hành vi</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {optedOut 
                      ? '✅ Bạn ĐÃ TẮT tính năng thu thập hành vi. Hệ thống sẽ không ghi nhận hoạt động duyệt web của bạn và chuyển sang gợi ý phổ biến chung.' 
                      : 'Hệ thống đang bật gợi ý cá nhân hoá. Bạn có thể tắt bất cứ lúc nào nếu muốn.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={optedOut}
                    onChange={handleToggleOptOut}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EA580C]"></div>
                </label>
              </div>
            </section>

            <div className="pt-8 mt-8 border-t border-stone-100 text-sm text-stone-400 italic text-center">
              Lần cập nhật cuối: Tháng 10/2026. Bằng việc tiếp tục sử dụng dịch vụ, bạn đồng ý với chính sách bảo mật này.
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default PrivacyPage;