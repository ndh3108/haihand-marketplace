/**
 * Demonstration Data Seeder for Behavioral Analytics & Recommendations
 * HaiHand Marketplace
 * Run: node scripts/seed-behavior-demo.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Product, Post } = require('../models/Product');
const User = require('../models/User');
const UserEvent = require('../models/UserEvent');
const UserInterestProfile = require('../models/UserInterestProfile');
const ProductCoView = require('../models/ProductCoView');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Thiếu biến môi trường MONGO_URI!');
  process.exit(1);
}

const SAMPLE_CATEGORIES = ['Đồ điện tử', 'Thời trang & Phụ kiện', 'Đồ gia dụng', 'Điện thoại & Phụ kiện', 'Máy ảnh & Ống kính'];

const SAMPLE_SEARCHES = [
  { query: 'máy ảnh canon', count: 18 },
  { query: 'iphone 13 cũ', count: 24 },
  { query: 'áo khoác bomber', count: 15 },
  { query: 'bàn làm việc gỗ', count: 12 },
  { query: 'tai nghe bluetooth sony', count: 20 },
  { query: 'xe đạp thể thao', count: 8 },
  { query: 'macbook air m1', count: 22 },
  { query: 'giày sneaker nike', count: 14 }
];

const ZERO_RESULT_SEARCHES = [
  { query: 'phi thuyền cá nhân', count: 6 },
  { query: 'kim cương xanh 10 cara', count: 4 },
  { query: 'xe tăng mini', count: 3 }
];

async function seedDemoData() {
  console.log('📡 Đang kết nối tới MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Đã kết nối MongoDB thành công!');

  try {
    // 1. Fetch available products
    let products = await Post.find({ status: { $in: ['active', 'APPROVED'] } }).limit(30);

    if (products.length === 0) {
      console.log('⚠️ Không có sản phẩm nào trong DB, tạo 6 sản phẩm mẫu...');
      const sampleProds = [
        { title: 'Máy ảnh Canon EOS 70D kèm len kit', name: 'Máy ảnh Canon EOS 70D', price: 6500000, category: 'Máy ảnh & Ống kính', condition: 'Đã qua sử dụng', status: 'active', stockQuantity: 2 },
        { title: 'Ống kính Canon 50mm f/1.8 STM', name: 'Ống kính Canon 50mm', price: 1800000, category: 'Máy ảnh & Ống kính', condition: 'Như mới', status: 'active', stockQuantity: 3 },
        { title: 'iPhone 12 Pro 128GB Quốc Tế', name: 'iPhone 12 Pro 128GB', price: 8900000, category: 'Đồ điện tử', condition: 'Mới 99%', status: 'active', stockQuantity: 1 },
        { title: 'Tai nghe Sony WH-1000XM4', name: 'Tai nghe Sony WH-1000XM4', price: 3800000, category: 'Đồ điện tử', condition: 'Đã qua sử dụng', status: 'active', stockQuantity: 2 },
        { title: 'Áo khoác gió The North Face chính hãng', name: 'Áo khoác The North Face', price: 450000, category: 'Thời trang & Phụ kiện', condition: 'Mới', status: 'active', stockQuantity: 5 },
        { title: 'Bàn làm việc gấp gọn thông minh', name: 'Bàn làm việc thông minh', price: 320000, category: 'Đồ gia dụng', condition: 'Mới', status: 'active', stockQuantity: 4 }
      ];
      products = await Post.insertMany(sampleProds);
      console.log(`✅ Đã tạo ${products.length} sản phẩm mẫu.`);
    }

    // 2. Fetch or create a test user
    let testUser = await User.findOne({ email: 'demo_shopper@haihand.vn' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Nguyễn Văn Demo',
        email: 'demo_shopper@haihand.vn',
        password: 'password123',
        phone: '0901234567',
        role: 'Khách hàng',
        walletBalance: 2000000
      });
      console.log('✅ Đã tạo tài khoản demo: demo_shopper@haihand.vn');
    }

    const demoUserId = testUser._id;
    const demoAnonId = 'anon_demo_visitor_9999';

    console.log('🧹 Dọn dẹp dữ liệu demo cũ...');
    await UserEvent.deleteMany({
      $or: [
        { userId: demoUserId },
        { anonymousId: { $regex: /^anon_demo_/ } }
      ]
    });
    await UserInterestProfile.deleteMany({
      $or: [
        { userId: demoUserId },
        { anonymousId: demoAnonId }
      ]
    });

    console.log('🌱 Đang sinh các sự kiện hành vi mẫu (UserEvent)...');
    const events = [];
    const now = Date.now();

    // Generate events spread over the past 14 days
    for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
      const dayTime = new Date(now - dayOffset * 24 * 60 * 60 * 1000);

      // Views (about 8-15 per day)
      const dailyViewCount = Math.floor(Math.random() * 8) + 8;
      for (let i = 0; i < dailyViewCount; i++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const isDemoUser = Math.random() > 0.4;
        const anonId = isDemoUser ? demoAnonId : `anon_demo_${Math.floor(Math.random() * 50)}`;

        events.push({
          userId: isDemoUser ? demoUserId : null,
          anonymousId: anonId,
          sessionId: `sess_${dayOffset}_${Math.floor(i / 3)}`,
          type: 'product_view',
          productId: prod._id,
          category: prod.category || 'Đồ điện tử',
          price: prod.price || 500000,
          source: 'home',
          meta: { condition: prod.condition || 'Mới', location: prod.location || 'Toàn quốc' },
          createdAt: new Date(dayTime.getTime() + i * 30 * 60 * 1000)
        });

        // 30% chance of a high dwell time
        if (Math.random() < 0.35) {
          events.push({
            userId: isDemoUser ? demoUserId : null,
            anonymousId: anonId,
            sessionId: `sess_${dayOffset}_${Math.floor(i / 3)}`,
            type: 'product_dwell',
            productId: prod._id,
            category: prod.category || 'Đồ điện tử',
            price: prod.price,
            source: 'detail',
            meta: { duration: Math.floor(Math.random() * 90) + 30 },
            createdAt: new Date(dayTime.getTime() + i * 30 * 60 * 1000 + 45000)
          });
        }

        // 20% chance of cart_add
        if (Math.random() < 0.22) {
          events.push({
            userId: isDemoUser ? demoUserId : null,
            anonymousId: anonId,
            type: 'cart_add',
            productId: prod._id,
            category: prod.category,
            price: prod.price,
            source: 'detail',
            createdAt: new Date(dayTime.getTime() + i * 30 * 60 * 1000 + 60000)
          });

          // 40% of cart additions turn into purchases
          if (Math.random() < 0.40) {
            events.push({
              userId: isDemoUser ? demoUserId : null,
              anonymousId: anonId,
              type: 'purchase',
              productId: prod._id,
              category: prod.category,
              price: prod.price,
              source: 'checkout',
              meta: { quantity: 1, paymentMethod: 'HAIPAY_WALLET' },
              createdAt: new Date(dayTime.getTime() + i * 30 * 60 * 1000 + 120000)
            });
          }
        }
      }
    }

    // Recommendation Impressions & Clicks
    const RECO_SOURCES = ['recently_viewed', 'for_you', 'similar', 'also_viewed', 'chatbot', 'cart'];
    for (const src of RECO_SOURCES) {
      const impCount = Math.floor(Math.random() * 60) + 40;
      const clickRate = src === 'for_you' ? 0.08 : (src === 'similar' ? 0.06 : 0.04);
      const clickCount = Math.max(2, Math.round(impCount * clickRate));

      for (let c = 0; c < impCount; c++) {
        events.push({
          anonymousId: demoAnonId,
          type: 'recommendation_impression',
          source: src,
          meta: { section: src, count: 5 },
          createdAt: new Date(now - Math.floor(Math.random() * 7 * 24 * 3600 * 1000))
        });
      }

      for (let c = 0; c < clickCount; c++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        events.push({
          userId: demoUserId,
          anonymousId: demoAnonId,
          type: 'recommendation_click',
          productId: prod._id,
          category: prod.category,
          price: prod.price,
          source: src,
          meta: { recoSource: src },
          createdAt: new Date(now - Math.floor(Math.random() * 7 * 24 * 3600 * 1000))
        });
      }
    }

    // Keyword Search Events
    for (const s of SAMPLE_SEARCHES) {
      for (let i = 0; i < s.count; i++) {
        events.push({
          anonymousId: demoAnonId,
          type: 'search',
          query: s.query,
          source: 'home',
          meta: { resultsCount: 5 },
          createdAt: new Date(now - Math.floor(Math.random() * 10 * 24 * 3600 * 1000))
        });
      }
    }

    for (const z of ZERO_RESULT_SEARCHES) {
      for (let i = 0; i < z.count; i++) {
        events.push({
          anonymousId: demoAnonId,
          type: 'search',
          query: z.query,
          source: 'home',
          meta: { resultsCount: 0 },
          createdAt: new Date(now - Math.floor(Math.random() * 5 * 24 * 3600 * 1000))
        });
      }
    }

    await UserEvent.insertMany(events);
    console.log(`✅ Đã thêm ${events.length} sự kiện UserEvent mẫu.`);

    // 3. Seed UserInterestProfile for Demo User
    const electronicProds = products.filter((p) => p.category?.includes('điện tử') || p.category?.includes('ảnh') || p.category?.includes('Thoại'));
    const demoProfile = new UserInterestProfile({
      userId: demoUserId,
      anonymousId: demoAnonId,
      categories: new Map([
        ['Máy ảnh & Ống kính', 18.5],
        ['Đồ điện tử', 14.2],
        ['Điện thoại & Phụ kiện', 8.0],
        ['Thời trang & Phụ kiện', 2.5]
      ]),
      priceRange: {
        median: 3500000,
        iqr: 2500000,
        minPreferred: 1000000,
        maxPreferred: 7500000,
        sampleCount: 15
      },
      preferredConditions: new Map([['Đã qua sử dụng', 8], ['Như mới', 5], ['Mới', 2]]),
      preferredLocations: new Map([['Hà Nội', 7], ['TP Hồ Chí Minh', 5], ['Toàn quốc', 3]]),
      segment: 'high_intent',
      recentProductIds: electronicProds.slice(0, 5).map((p) => p._id),
      purchasedProductIds: electronicProds.slice(0, 1).map((p) => p._id),
      lastEventAt: new Date()
    });
    await demoProfile.save();
    console.log('✅ Đã tạo hồ sơ sở thích UserInterestProfile mẫu cho user:', demoUserId.toString());

    // 4. Seed ProductCoView Matrix
    console.log('🌱 Đang tạo ma trận Co-View (ProductCoView)...');
    if (products.length >= 2) {
      const coViewPairs = [];
      for (let i = 0; i < Math.min(8, products.length - 1); i++) {
        const pA = products[i]._id;
        const pB = products[i + 1]._id;
        coViewPairs.push(
          { productId: pA, coViewedProductId: pB, count: Math.floor(Math.random() * 15) + 5, lastUpdated: new Date() },
          { productId: pB, coViewedProductId: pA, count: Math.floor(Math.random() * 15) + 5, lastUpdated: new Date() }
        );
      }
      for (const pair of coViewPairs) {
        await ProductCoView.findOneAndUpdate(
          { productId: pair.productId, coViewedProductId: pair.coViewedProductId },
          { $set: pair },
          { upsert: true }
        );
      }
      console.log(`✅ Đã tạo ${coViewPairs.length} cặp ProductCoView mẫu.`);
    }

    console.log('\n=============================================');
    console.log('🎉 SEED DỮ LIỆU DEMO HOÀN TẤT THÀNH CÔNG!');
    console.log('=============================================');
    console.log(`- Tài khoản Demo: demo_shopper@haihand.vn (ID: ${demoUserId})`);
    console.log(`- Anonymous ID: ${demoAnonId}`);
    console.log('- Xem giao diện gợi ý: http://localhost:3000 (HomePage, ProductDetailPage, CartPage, FavoritesPage)');
    console.log('- Xem phân tích Admin: http://localhost:4001/admin/behavior-analytics');
    console.log('- Xem hiệu quả Seller: http://localhost:3000/seller-channel');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu demo:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDemoData();

