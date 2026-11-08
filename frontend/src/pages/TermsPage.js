import React from 'react';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const TermsPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      
      <div className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-[#1C1917] mb-4">Quy chế hoạt động</h1>
            <div className="w-16 h-1 bg-[#EA580C] mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-8 text-stone-600 leading-relaxed text-sm md:text-base">
            <section>
              <p>
                Chào mừng bạn đến với <strong className="text-[#EA580C]">HaiHand Marketplace</strong>. Khi sử dụng website của chúng tôi, bạn đồng ý tuân thủ các điều khoản dưới đây. Vui lòng đọc kỹ trước khi tham gia mua bán để đảm bảo quyền lợi và trải nghiệm an toàn nhất.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">1</span>
                Quy định về tài khoản
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Người dùng phải cung cấp thông tin chính xác, trung thực khi đăng ký tài khoản.</li>
                <li>Bạn có trách nhiệm bảo mật thông tin đăng nhập và mật khẩu của mình. Mọi giao dịch phát sinh từ tài khoản của bạn sẽ do bạn hoàn toàn chịu trách nhiệm.</li>
                <li>HaiHand có quyền khóa tài khoản tạm thời hoặc vĩnh viễn nếu phát hiện hành vi gian lận, lừa đảo, hoặc vi phạm nghiêm trọng Tiêu chuẩn cộng đồng.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">2</span>
                Quy định đăng tin
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Chỉ đăng bán các sản phẩm hợp pháp, không thuộc danh mục hàng cấm theo quy định của pháp luật Việt Nam.</li>
                <li>Hình ảnh và mô tả sản phẩm phải trung thực, rõ ràng và đúng với tình trạng thực tế của sản phẩm.</li>
                <li>Không đăng tin rác (spam), tin trùng lặp, hoặc sử dụng ngôn từ phản cảm, gây kích động.</li>
                <li>Hàng giả, hàng nhái phải được mô tả rõ ràng, không được mạo danh hàng chính hãng để lừa đảo người mua.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1C1917] mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] text-sm">3</span>
                Trách nhiệm của các bên
              </h2>
              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="font-bold text-[#1C1917] mb-1">Đối với người bán</h3>
                  <p>Đảm bảo chất lượng sản phẩm đúng như mô tả, giao hàng đúng hẹn và hỗ trợ người mua trong quá trình bảo hành (nếu có).</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="font-bold text-[#1C1917] mb-1">Đối với người mua</h3>
                  <p>Có trách nhiệm kiểm tra kỹ thông tin sản phẩm, uy tín của người bán trước khi giao dịch. Khuyến khích sử dụng ví HaiPay hoặc giao dịch trực tiếp để đảm bảo an toàn.</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h3 className="font-bold text-[#1C1917] mb-1">Đối với HaiHand</h3>
                  <p>Chúng tôi đóng vai trò là nền tảng kết nối trung gian. HaiHand không chịu trách nhiệm pháp lý trực tiếp về chất lượng sản phẩm hay các tranh chấp cá nhân. Tuy nhiên, chúng tôi cam kết hỗ trợ tối đa bằng cách cung cấp thông tin, đóng băng tài khoản lừa đảo và phối hợp với cơ quan chức năng khi cần thiết.</p>
                </div>
              </div>
            </section>

            <div className="pt-8 mt-8 border-t border-stone-100 text-sm text-stone-400 italic text-center">
              Lần cập nhật cuối: Tháng 10/2026. HaiHand có quyền thay đổi điều khoản bất kỳ lúc nào mà không cần báo trước.
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default TermsPage;