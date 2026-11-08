# HaiHand Marketplace

Nền tảng thương mại điện tử đa người bán (Multi-Vendor C2C/B2C) đồ cũ & tái sử dụng hàng đầu tại Việt Nam, tích hợp trợ lý AI thông minh (Qwen3-VL, BGE-M3) và hệ thống gợi ý sản phẩm cá nhân hóa theo hành vi (Behavioral Recommendation Engine).

---

## 🏗️ Kiến Trúc Hệ Thống Gợi Ý & Phân Tích Hành Vi

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG THU THẬP (TRACKING)                        │
│  - Frontend tracker.js: sendBeacon / fetch keepalive                   │
│  - Đo Dwell Time qua visibilitychange (5s - 5 phút)                    │
│  - Chống trùng Product View (30 phút / sản phẩm)                       │
│  - Ghi nhận Server-Side cho cart_add, favorite_*, purchase             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ POST /api/track
┌────────────────────────────────────────────────────────────────────────┐
│                      TẦNG XỬ LÝ & PHÂN TÍCH HÀNH VI                    │
│  - Lọc Bot / Crawler & Whitelist trường an toàn (bảo mật PII)          │
│  - Loại bỏ hành vi tự xem sản phẩm của chính chủ shop                  │
│  - Lưu trữ UserEvent (TTL Index tự động xóa sau 90 ngày)               │
│  - Cập nhật tăng dần UserInterestProfile (Half-life decay 14 ngày)     │
│  - Xây dựng ma trận tương quan Co-View (ProductCoView)                 │
│  - Gộp danh tính (AnonymousId ➔ UserId) khi đăng nhập / đăng ký        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ĐỘNG CƠ GỢI Ý LAI (HYBRID RECO)                    │
│  Score = 0.40·ContentSim (Cosine textEmbedding / $vectorSearch)        │
│        + 0.25·CategoryAffinity                                         │
│        + 0.15·PriceFit (Khoảng giá Median ± IQR)                       │
│        + 0.10·CoViewMatrix                                             │
│        + 0.10·Popularity (soldCount, view 7 ngày) - AgePenalty         │
│  Ràng buộc: CATALOG_VISIBLE, stockQuantity > 0, tối đa 2 sp / seller   │
│  Cold-start: Tự động fallback sản phẩm trending 7 ngày + mới đăng      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ GIAO DIỆN MUA SẮM│       │   ADMIN PORTAL   │       │ KÊNH NGƯỜI BÁN   │
│ - Sp bạn đã xem  │       │ - Phễu xem→giỏ→mua│      │ - Lượt xem sp    │
│ - Gợi ý cho bạn  │       │ - CTR từng khối  │       │ - Lượt thêm giỏ  │
│ - Sp tương tự    │       │ - Top sp xem     │       │ - Tỉ lệ chuyển   │
│ - Khách cũng xem │       │ - Từ khóa tìm    │       │   đổi (CR)       │
│ - Chatbot rerank │       │ - Phân bố ngành  │       │                  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 🚀 Danh Sách API Endpoints Mới

### 1. Thu thập & Quản lý danh tính
- `POST /api/track`: Tiếp nhận mảng tối đa 20 sự kiện từ client (hỗ trợ cả khách vãng lai `anonymousId` và người đăng nhập `userId`).
- `POST /api/track/merge`: Gộp toàn bộ sự kiện và hồ sơ sở thích từ `anonymousId` sang `userId` khi đăng nhập hoặc đăng ký thành công.
- `GET /api/track/status`: Kiểm tra trạng thái hoạt động của engine tracking.

### 2. Gợi ý sản phẩm
- `GET /api/recommendations/recently-viewed`: "Sản phẩm bạn đã xem", trả về danh sách đã xem gần nhất, loại trừ hàng đã hết hoặc bị ẩn.
- `GET /api/recommendations/for-you`: "Gợi ý cho bạn" theo thuật toán hybrid (nội dung embedding, danh mục, khoảng giá, co-view, độ thịnh hành).
- `GET /api/recommendations/similar/:productId`: "Sản phẩm tương tự" tại trang chi tiết (vector search qua embedding, fallback cùng danh mục & giá ±30%).
- `GET /api/recommendations/also-viewed/:productId`: "Người xem sản phẩm này cũng xem" dựa trên ma trận đồng xem `ProductCoView`.

### 3. Phân tích & Quản trị
- `GET /api/seller/analytics`: Dữ liệu phân tích hiệu quả dành riêng cho Seller (lượt xem, thêm giỏ, lượt mua, tỉ lệ chuyển đổi từng sản phẩm).
- `GET /admin/behavior-analytics?days=7|30`: Bảng điều khiển phân tích hành vi dành cho Admin (phễu chuyển đổi, tỷ lệ CTR từng khối gợi ý, từ khóa tìm kiếm phổ biến và từ khóa 0 kết quả).

---

## 🔒 Quyền Riêng Tư & Cơ Chế Opt-out

HaiHand tuân thủ nghiêm ngặt các nguyên tắc bảo vệ quyền riêng tư:
1. **Không thu thập PII**: Tuyệt đối không lưu email, mật khẩu, số điện thoại, địa chỉ nhận hàng trong `UserEvent`.
2. **Tự hủy dữ liệu (TTL 90 ngày)**: Mọi sự kiện hành vi được đánh index MongoDB TTL `{ createdAt: 1 }, { expireAfterSeconds: 7776000 }` tự động dọn dẹp sau 90 ngày.
3. **Quyền từ chối thu thập (Opt-out)**:
   - Người dùng có thể bật/tắt quyền thu thập hành vi bất cứ lúc nào tại trang **Chính sách bảo mật** (`/privacy`).
   - Khi bật Opt-out, frontend dừng phát sinh mọi request `/api/track` và hệ thống chuyển sang gợi ý sản phẩm phổ biến chung.

---

## 🧪 Chạy Kiểm Thử (Tests) & Dữ Liệu Mẫu (Demo)

### Chạy Unit Test Backend:
```powershell
cd backend
npx jest test/behaviorAndRecommendation.test.js test/trackApi.test.js
```

### Sinh dữ liệu mẫu thử nghiệm (Demo Seeder):
Script sinh dữ liệu mẫu gồm hàng trăm sự kiện hành vi, hồ sơ sở thích, ma trận co-view, lượt tìm kiếm và phễu chuyển đổi:
```powershell
cd backend
node scripts/seed-behavior-demo.js
```

Sau khi seed:
- Mở **Trang chủ** (`http://localhost:3000`): Xuất hiện ngay "Sản phẩm bạn đã xem" và "Gợi ý cho bạn".
- Mở **Trang chi tiết** (`http://localhost:3000/post/:id`): Xuất hiện "Sản phẩm tương tự" và "Người xem sản phẩm này cũng xem".
- Mở **Admin Portal** (`http://localhost:4001/admin/behavior-analytics`): Xem phễu chuyển đổi, CTR gợi ý và biểu đồ phân tích.
- Mở **Kênh người bán** (`http://localhost:3000/seller-channel`): Xem bảng hiệu quả & chuyển đổi sản phẩm của shop.

---

## 🐳 Khởi Chạy Bằng Docker

```powershell
Copy-Item backend/.env.example backend/.env
# Điền MONGO_URI và JWT_SECRET trong backend/.env
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Admin Portal**: http://localhost:4001
