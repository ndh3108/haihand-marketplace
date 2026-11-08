web application/stitch/projects/7057037459226456888/screens/3be5f00a28c349a4905d3fa1601efa1d
# Hệ thống thiết kế (Design System) — HaiHand (Sàn Đồ Cũ C2C Việt Nam)

Hệ thống thiết kế chuẩn hóa cho nền tảng thương mại điện tử đồ cũ C2C HaiHand, kết hợp bố cục thực dụng của Shopee với phong cách tối giản, hiện đại và tinh tế của shadcn/ui. 

Tất cả các màn hình trên toàn hệ thống bắt buộc phải kế thừa và sử dụng chung một thư viện **Component dùng chung (Global Shared Components)** để đảm bảo tính nhất quán 100% về giao diện, hành vi tương tác và trải nghiệm người dùng.

---

## 1. Nguyên tắc thiết kế (Design Principles)

1. **Minh bạch & Đơn giản (Transparency & Simplicity)**:
   - Tối giản hóa quy trình mua bán đồ cũ C2C: mua sắm trực tiếp qua giỏ hàng và thanh toán nhanh chóng.
   - Tập trung vào độ tin cậy từ đánh giá cộng đồng, thời gian hoạt động của người bán và hình ảnh thực tế của món hàng.
   - Không còn cơ chế trả giá phức tạp hay xác thực CCCD rườm rà.

2. **Ấm áp & Thân thiện (Warm & Utilitarian)**:
   - Tông màu vàng dịu ấm (`#FACC15` / `#FDE047`) kết hợp với nền kem ấm (`#FFFBEB`) mang lại cảm giác gần gũi của đồ dùng đã qua sử dụng, nhưng vẫn sạch sẽ, hiện đại và chỉn chu.

3. **Thực dụng & Tiện lợi (Utilitarian Flow)**:
   - Các hành động giao dịch cốt lõi: *Mua ngay*, *Thêm vào giỏ*, *Chat trao đổi ảnh*, *Gặp trực tiếp* và *Thanh toán thuận tiện (VNPay, Ví HaiPay, COD)*.

---

## 2. Bảng màu (Color Palette & Tokens)

### 2.1. Màu sắc chủ đạo (Brand & Primary)
- **Primary Base**: `#FACC15` (Yellow 400 - Vàng ấm nhận diện thương hiệu)
- **Primary Hover / Light**: `#FDE047` (Yellow 300)
- **Primary Active / Dark**: `#EAB308` (Yellow 500)
- **Primary Foreground (Text trên nền vàng)**: `#1C1917` (Stone 900 - Đạt chuẩn tương phản cao WCAG AAA)

### 2.2. Màu điểm nhấn giao dịch (Accent & Conversion)
- **Price / Highlight Accent**: `#EA580C` (Orange 600 - Màu cam đậm hiển thị giá bán đồ cũ)
- **Price Light / Sub-accent**: `#F97316` (Orange 500)
- **Price Tag Badge BG**: `#FFEDD5` (Orange 100)

### 2.3. Màu bề mặt & Nền (Surfaces & Backgrounds)
- **Page Background**: `#FFFBEB` (Amber 50 - Nền kem vàng ấm, bảo vệ mắt)
- **Card / Surface Lowest**: `#FFFFFF` (White - Nền thẻ sản phẩm, panel, modal)
- **Surface Muted / Low**: `#FAF2EE` / `#F5F5F4` (Stone 100 - Khung lọc, viền mềm, ô tìm kiếm)
- **Surface Border / Divider**: `#E7E5E4` (Stone 200 - Đường kẻ viền mảnh sắc nét)

### 2.4. Màu trạng thái & Bộ 4 nhãn tình trạng chuẩn (Semantic Status)
- **Mới**: Text `#16A34A` (Green 600) | Nền `#DCFCE7` (Green 100) | Viền `#BBF7D0`
- **Như mới**: Text `#2563EB` (Blue 600) | Nền `#DBEAFE` (Blue 100) | Viền `#BFDBFE`
- **Đã qua sử dụng**: Text `#4B5563` (Gray 700) | Nền `#F3F4F6` (Gray 100) | Viền `#E5E7EB`
- **Cũ**: Text `#D97706` (Amber 600) | Nền `#FEF3C7` (Amber 100) | Viền `#FDE68A`
- **Hủy tin / Xóa**: Text `#DC2626` (Red 600) | Nền `#FEE2E2` (Red 100)

### 2.5. Màu văn bản (Typography Colors)
- **Text Primary**: `#1C1917` (Stone 900)
- **Text Secondary**: `#57534E` (Stone 600)
- **Text Muted / Placeholder**: `#A8A29E` (Stone 400)

---

## 3. Hệ thống Typography (Kiểu chữ)

- **Font chữ chính**: `Inter, system-ui, -apple-system, sans-serif`
- **Thang kích thước chuẩn**:
  - **Display / Hero H1**: `28px - 32px` | `font-bold` (`700`), `tracking-tight`
  - **Page Title H2**: `20px - 24px` | `font-bold` (`700`)
  - **Section Title H3**: `16px - 18px` | `font-semibold` (`600`)
  - **Card Title**: `14px - 15px` | `font-medium` (`500`) hoặc `font-semibold` (`600`), 2 dòng `line-clamp-2`
  - **Body / Content**: `14px` | `font-normal` (`400`), `leading-relaxed`
  - **Small / Meta**: `12px` | `font-normal` (`400`)
  - **Micro / Badge**: `11px` | `font-semibold` (`600`)

---

## 4. Quy chuẩn kỹ thuật giao dịch & Thanh toán

### 4.1. Bộ 4 nhãn tình trạng sản phẩm quy chuẩn
Áp dụng bất biến cho tất cả các trang danh mục, tìm kiếm, giỏ hàng và chi tiết món đồ:
1. **Mới**: Hàng chưa qua sử dụng, còn nguyên hộp/tem mác.
2. **Như mới**: Đã khui hộp hoặc dùng lướt vài lần, không trầy xước.
3. **Đã qua sử dụng**: Đang hoạt động tốt, có hao mòn nhẹ theo thời gian.
4. **Cũ**: Hao mòn rõ rệt theo thời gian, thích hợp cho người mua muốn tối ưu chi phí.

### 4.2. 3 Phương thức thanh toán duy nhất
Hệ thống chấp nhận đồng bộ trên tất cả các màn hình:
- **VNPay** (Cổng thanh toán QR ngân hàng / Thẻ nội địa)
- **Ví HaiPay** (Ví điện tử tích hợp trên hệ thống HaiHand)
- **COD** (Thanh toán tiền mặt khi nhận hàng)

*(Nghiêm cấm xuất hiện: nút "Trả giá", xác thực CCCD, hệ thống bảo vệ Escrow/Shield).*

---

## 5. Thư viện Component dùng chung (Global Shared Components)
*Tất cả các trang bắt buộc phải sử dụng chung các component chuẩn hóa dưới đây để bảo đảm tính nhất quán toàn diện.*

### 5.1. `AppHeader` (Thanh điều hướng cố định đỉnh trang)
- **Cấu trúc đồng bộ**:
  - Logo HaiHand (nền vàng `#FACC15`, chữ `HaiHand` + tagline `SÀN ĐỒ CŨ VIỆT`).
  - Thanh tìm kiếm lớn ở vị trí trung tâm (`rounded-lg`, kèm nút kính lúp nền tối `#1C1917`).
  - Menu điều hướng: *Trang chủ*, *Khám phá*, *Tin nhắn* (có badge tin chưa đọc).
  - Cụm tiện ích người dùng: Icon Thông báo, Giỏ hàng có badge đỏ đếm số món (`bg-red-500 text-white text-xs`).
  - Avatar người dùng kèm tên đăng nhập (`Minh Tuấn`).
  - Nút CTA **"+ Đăng tin"** màu đen nổi bật (`bg-stone-900 hover:bg-stone-800 text-white rounded-lg px-4 py-2`).

### 5.2. `AppFooter` (Chân trang chuẩn sàn TMĐT)
- **Cấu trúc 5 cột cố định**:
  1. *Giới thiệu HaiHand*: Logo thương hiệu, slogan, mạng xã hội và thông tin pháp nhân.
  2. *Chăm sóc khách hàng*: Trung tâm trợ giúp, Hướng dẫn mua đồ cũ an toàn, Quy trình giải quyết tranh chấp.
  3. *Về HaiHand*: Giới thiệu, Tuyển dụng, Tiêu chuẩn cộng đồng, Tác động môi trường dọn đồ cũ.
  4. *Thanh toán & Vận chuyển*: Hiển thị cố định 3 phương thức: **VNPay, Ví HaiPay, COD**.
  5. *Quy chế sàn TMĐT*: Quy chế hoạt động, Chính sách bảo mật, Biểu phí minh bạch.
- Dòng chân trang bản quyền: `© 2025 HaiHand - Mua bán đồ cũ văn minh, tiết kiệm. Mã số doanh nghiệp: 0108992384`.

### 5.3. `ProductCard` (Thẻ sản phẩm C2C)
- **Kích thước & Bố cục**: Nền trắng `#FFFFFF`, viền mỏng `#E7E5E4`, bo góc `rounded-lg` (8px), hiệu ứng hover nhẹ `hover:shadow-md hover:-translate-y-0.5 transition-all`.
- **Khung ảnh**: Tỷ lệ vuông `aspect-square`, `object-cover`, bo góc trên `rounded-t-lg`.
- **Góc trên bên trái ảnh**: Component `ConditionBadge` chuẩn (Mới, Như mới, Đã qua sử dụng, Cũ).
- **Góc trên bên phải ảnh**: Nút tim yêu thích hình tròn màu trắng mờ.
- **Tiêu đề**: 2 dòng (`line-clamp-2`), font chữ `text-sm font-medium text-stone-900`.
- **Giá bán**: Font số lớn `font-bold text-base text-[#EA580C]`.
- **Thông tin phụ (Meta)**: Khu vực (Quận/Huyện, Tỉnh thành) kèm thời gian đăng tin (*15 phút trước*, *Hôm qua*).

### 5.4. `ConditionBadge` (Huy hiệu tình trạng sản phẩm)
- Sử dụng dạng pill hoặc tag bo góc `rounded px-2 py-0.5 text-xs font-semibold`:
  - `Mới`: `bg-emerald-100 text-emerald-700 border border-emerald-200`
  - `Như mới`: `bg-blue-100 text-blue-700 border border-blue-200`
  - `Đã qua sử dụng`: `bg-stone-100 text-stone-700 border border-stone-200`
  - `Cũ`: `bg-amber-100 text-amber-800 border border-amber-200`

### 5.5. `Button` (Hệ thống nút bấm quy chuẩn)
- **Primary CTA (`Button variant="primary"`)**: Nền vàng `#FACC15`, chữ tối `#1C1917`, `font-semibold`, bo góc `8px`. Dùng cho: *Mua ngay*, *Đặt hàng*, *Đăng tin bán ngay*.
- **Secondary CTA (`Button variant="secondary"`)**: Nền trắng `#FFFFFF`, viền xám `#E7E5E4`, chữ `#1C1917`. Dùng cho: *Chat ngay*, *Thêm vào giỏ*, *Hẹn gặp xem hàng*.
- **Dark CTA (`Button variant="dark"`)**: Nền đen `#1C1917`, chữ trắng `#FFFFFF`. Dùng cho: *Đăng tin*, *Áp dụng*.

### 5.6. `SellerInfoCard` (Thẻ uy tín người bán)
- Hiển thị avatar tròn, tên người bán, thời gian tham gia, xếp hạng sao (ví dụ: `★ 4.9`), tỷ lệ phản hồi chat (`98%`), địa chỉ khu vực và nhãn trạng thái *"Tài khoản hoạt động tích cực"*.

### 5.7. `PaymentMethodList` (Danh sách phương thức thanh toán)
- Hiển thị cố định 3 lựa chọn kèm logo/biểu tượng chuẩn:
  1. **VNPay** (Quét mã VNPAY-QR qua 40+ ứng dụng ngân hàng)
  2. **Ví HaiPay** (Thanh toán tức thì với số dư ví)
  3. **COD** (Thanh toán tiền mặt tận nhà khi nhận hàng)

---

## 6. Danh mục 6 màn hình chuẩn hóa trên Canvas

1. **Trang chủ (`Trang chủ Sàn Đồ Cũ HaiHand`)**: Tích hợp `AppHeader`, banner dọn nhà, danh mục ngành hàng, lưới `ProductCard` 5 cột và `AppFooter`.
2. **Tìm kiếm & Bộ lọc (`Tìm kiếm & Bộ lọc sản phẩm - HaiHand`)**: Cột bộ lọc 4 nhãn tình trạng, khu vực, khoảng giá và lưới `ProductCard` 4 cột.
3. **Chi tiết sản phẩm (`Chi tiết sản phẩm - iPhone 14 Pro Max 256GB - HaiHand`)**: Ảnh chi tiết, giá cam, `ConditionBadge`, `SellerInfoCard`, cụm `Button` (Mua ngay / Thêm vào giỏ / Chat ngay) và `PaymentMethodList`.
4. **Giỏ hàng gom theo người bán (`Giỏ hàng gom theo người bán - HaiHand`)**: Gom nhóm shop, quản lý số lượng, kiểm tra `PaymentMethodList` và nút đặt hàng đồng bộ.
5. **Hồ sơ cá nhân & Quản lý tin đăng (`Hồ sơ cá nhân & Quản lý tin đăng - HaiHand`)**: Thông tin người bán, quản lý số dư Ví HaiPay và các thẻ sản phẩm kèm nút Sửa/Đẩy tin.
6. **Khung chat & Tin nhắn C2C (`Khung chat & Tin nhắn C2C - HaiHand`)**: 2 cột chat, thanh ghim sản phẩm tích hợp `ConditionBadge` và nút `Button` (Mua ngay / Hẹn gặp test).
