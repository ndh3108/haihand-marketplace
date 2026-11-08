require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Order = require('./models/Order');
const { Product, Post } = require('./models/Product');
const { protect, isSeller } = require('./middleware/auth');
const Transaction = require('./models/Transaction');
const Settings = require('./models/Settings');
const {
  CATALOG_VISIBLE,
  canonicalStatus,
  productOwnerId,
  orderBuyerId,
  orderSellerId,
  isEscrow,
  sanitizeUser,
  signUserToken,
  displayProductName
} = require('./utils/b2c');
const createSellerRouter = require('./routes/seller');
const haipayRouter = require('./routes/haipay');
const { indexProductImage } = require('./services/imageEmbeddingService');
const shippingRouter = require('./routes/shipping');
const addressRouter = require('./routes/address');
const PaymentSession = require('./models/PaymentSession');
const { processCheckout, settlePaymentSession } = require('./controllers/checkoutController');
const trackRouter = require('./routes/track');
const recommendationsRouter = require('./routes/recommendations');
const {
  recordServerEvent,
  mergeUserIdentity,
  runNightlyMaintenance
} = require('./services/behaviorAnalysisService');

const app = express();


const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4001',
  'http://127.0.0.1:4001',
  'https://haihand-marketplace.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for development/container networking
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'userid', 'UserId', 'X-Requested-With', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.options('{*path}', cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, userid, UserId');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4001",
      "http://127.0.0.1:4001",
      "https://haihand-marketplace.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(express.json({ limit: '7mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



const fs = require('fs');
app.set('view engine', 'ejs');
const viewsDir = fs.existsSync(path.join(__dirname, 'views')) ? path.join(__dirname, 'views') : path.join(__dirname, '../admin/views');
app.set('views', viewsDir);


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HaiHand_Images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

const upload = multer({ storage: storage });

const DB_URL = process.env.MONGO_URI || process.env.MONGODB_URI;

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!primaryUri) {
    console.error('❌ Thiếu biến môi trường MONGO_URI!');
    return false;
  }

  console.log('📡 Đang kết nối tới MongoDB Atlas...');
  try {
    await mongoose.connect(primaryUri);
    console.log('✅ Đã kết nối MongoDB Atlas thành công!');
    try {
      await User.updateMany(
        { $or: [{ sellerStatus: { $exists: false } }, { sellerStatus: null }] },
        { $set: { isSeller: false, sellerStatus: 'none' } }
      );
    } catch (migrateErr) {
      console.warn('B2C field default (non-blocking):', migrateErr.message);
    }
    return true;
  } catch (err) {
    console.error(`❌ Kết nối MongoDB Atlas thất bại: ${err.message}`);
    return false;
  }
};
connectDB();




const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, default: '' }
}));

const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  images: [String],
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}));

const Revenue = mongoose.models.Revenue || mongoose.model('Revenue', new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  commissionAmount: { type: Number, required: true },
  description: { type: String, default: 'Chiết khấu 5% từ đơn hàng' }
}, { timestamps: true }));

const Review = mongoose.models.Review || mongoose.model('Review', new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true }));

const UserNotification = mongoose.models.UserNotification || mongoose.model('UserNotification', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  message: String,
  link: String,
  isRead: { type: Boolean, default: false }
}, { timestamps: true }));

const Report = mongoose.models.Report || mongoose.model('Report', new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  reason: String,
  status: { type: String, enum: ['Chờ xử lý', 'Đã xử lý'], default: 'Chờ xử lý' }
}, { timestamps: true }));

const Follow = mongoose.models.Follow || mongoose.model('Follow', new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

const notificationService = require('./utils/notificationService');
notificationService.init(io, (uId) => (typeof getUserSockets === 'function' ? getUserSockets(uId) : []));
const sendNotification = notificationService.sendNotification;
const sendAdminNotification = notificationService.sendAdminNotification;

const session = require('express-session');
app.use(session({
  secret: 'khoa-bi-mat-haihand',
  resave: false,
  saveUninitialized: false
}));

const requireAdmin = (req, res, next) => {
  if (req.session.adminId) return next();

  // Support Bearer JWT for API endpoints
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      if (decoded.role === 'Admin') {
        req.adminId = decoded.id;
        return next();
      }
    } catch (e) { }
  }

  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ message: 'Truy cập bị từ chối' });
  }
  res.redirect('/login');
};

app.use(createSellerRouter({ upload, sendNotification, sendAdminNotification, io }));
const shippingController = require('./controllers/shippingController');
const webhookRouter = require('./routes/webhook');
app.post('/api/seller/orders/:orderId/ship', protect, shippingController.createShipmentGHN);
app.use('/api/webhook', webhookRouter);
app.use('/api/haipay', haipayRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/users/me/addresses', addressRouter);
app.use('/api/addresses', addressRouter);
app.use('/api', trackRouter);
app.use('/api', recommendationsRouter);
app.post('/api/checkout', protect, processCheckout);

// Schedule nightly maintenance for behavioral engine (runs once every 24h)
setInterval(() => {
  runNightlyMaintenance().catch((err) => console.warn('Nightly maintenance schedule error:', err.message));
}, 24 * 60 * 60 * 1000).unref();

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await User.findOne({ username, password, role: 'Admin' });
    if (admin) {
      req.session.adminId = admin._id;
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Tài khoản không tồn tại hoặc bạn không phải Admin!' });
    }
  } catch (err) {
    res.render('login', { error: 'Lỗi hệ thống khi đăng nhập: ' + err.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.render('login', { error: 'Email hoặc Username đã bị trùng!' });

    const newUser = new User({ name, email, username, password, role });
    await newUser.save();
    res.render('login', { error: 'Tạo tài khoản thành công! Hãy đăng nhập.' });
  } catch (error) {
    res.render('login', { error: 'Lỗi hệ thống khi đăng ký!' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', (req, res) => res.redirect('/dashboard'));

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Tạm thời so sánh plaintext, sau này cần đổi qua bcrypt.compare()
    const admin = await User.findOne({ username, password, role: 'Admin' });
    if (admin) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
      res.status(200).json({ message: 'Đăng nhập thành công', token, user: admin });
    } else {
      res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Middleware xác thực JWT cho Admin
const requireAdminJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Truy cập bị từ chối' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    if (decoded.role !== 'Admin') return res.status(403).json({ message: 'Bạn không có quyền quản trị!' });
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

app.get('/api/admin/dashboard-stats', requireAdminJWT, async (req, res) => {
  const safe = async (label, fn, fallback) => {
    try { return await fn(); } catch (e) { console.error(`Dashboard error [${label}]:`, e.message); return fallback; }
  };
  try {
    const now = new Date();
    const notDeleted = { isDeleted: { $ne: true } };
    const lockedFilter = {
      ...notDeleted,
      $or: [
        { isBanned: true },
        { status: 'locked', $or: [{ lockedUntil: null }, { lockedUntil: { $gt: now } }] }
      ]
    };
    const PENDING = ['PENDING', 'Pending', 'Chờ duyệt'];
    const COMPLETED = ['Completed', 'Delivered', 'Hoàn thành', 'Đã giao thành công', 'Đã thanh toán (Admin giữ tiền)'];

    const setting = (await safe('settings', () => Settings.findOne().lean(), null)) || { platformFeePercentage: 5 };
    const feePercent = Number(setting.platformFeePercentage ?? setting.commissionRate ?? 5);

    const [userCount, lockedUserCount, postCount, pendingCount, gmvAgg] = await Promise.all([
      safe('userCount', () => User.countDocuments(notDeleted), 0),
      safe('lockedUserCount', () => User.countDocuments(lockedFilter), 0),
      safe('productCount', () => Product.countDocuments({ status: { $nin: ['DELETED', ...PENDING] } }), 0),
      safe('pendingCount', () => Product.countDocuments({ status: { $in: PENDING } }), 0),
      safe('gmv', () => Order.aggregate([
        { $match: { status: { $in: COMPLETED } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]), [])
    ]);

    const gmv = (gmvAgg[0] && gmvAgg[0].total) || 0;
    res.json({
      stats: {
        userCount,
        activeUserCount: Math.max(0, userCount - lockedUserCount),
        lockedUserCount,
        postCount,
        pendingCount,
        gmv,
        revenue: Math.round(gmv * feePercent / 100),
        platformFeePercentage: feePercent
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({
      stats: { userCount: 0, activeUserCount: 0, lockedUserCount: 0, postCount: 0, pendingCount: 0, gmv: 0, revenue: 0, platformFeePercentage: 5 },
      degraded: true
    });
  }
});

// Thêm Admin REST APIs cho React Frontend
app.get('/api/admin/users', requireAdminJWT, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status && status !== 'all') {
      if (status === 'banned') query.isBanned = true;
      else if (status === 'active') { query.isBanned = { $ne: true }; query.isDeleted = { $ne: true }; }
      else if (status === 'deleted') query.isDeleted = true;
      else if (status === 'seller') { query.isSeller = true; query.sellerStatus = 'approved'; }
    } else {
      // By default don't show deleted users unless filtered
      query.isDeleted = { $ne: true };
    }

    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    res.json({ users, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

app.put('/api/admin/users/:id/ban', requireAdminJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (user.role === 'Admin') return res.status(403).json({ message: 'Không thể khóa Admin!' });

    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ message: user.isBanned ? 'Đã khóa tài khoản!' : 'Đã mở khóa tài khoản!', isBanned: user.isBanned });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

app.delete('/api/admin/users/:id', requireAdminJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (user.role === 'Admin') return res.status(403).json({ message: 'Không thể xóa Admin!' });

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isBanned = true;
    await user.save();
    res.json({ message: 'Đã xóa mềm tài khoản người dùng!', user: sanitizeUser(user) });
  } catch (error) { res.status(500).json({ message: 'Lỗi khi xóa người dùng' }); }
});

app.put('/api/admin/users/:id/restore', requireAdminJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    user.isDeleted = false;
    user.deletedAt = null;
    user.isBanned = false;
    await user.save();
    res.json({ message: 'Đã khôi phục tài khoản người dùng!', user: sanitizeUser(user) });
  } catch (error) { res.status(500).json({ message: 'Lỗi khi khôi phục người dùng' }); }
});

// Admin Global Settings APIs
app.get('/api/admin/settings', requireAdminJWT, async (req, res) => {
  try {
    const settings = await Settings.getGlobal();
    res.json({ settings });
  } catch (error) { res.status(500).json({ message: 'Lỗi lấy cấu hình hệ thống' }); }
});

app.put('/api/admin/settings', requireAdminJWT, async (req, res) => {
  try {
    const settings = await Settings.getGlobal();
    const updatable = [
      'commissionRate', 'maintenanceMode', 'bannerAnnouncement',
      'allowNewSellerRegistration', 'codEnabled', 'vnpayEnabled', 'haipayEnabled',
      'supportHotline', 'supportEmail'
    ];
    updatable.forEach(key => {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    });
    await settings.save();
    res.json({ message: 'Đã lưu cấu hình hệ thống thành công!', settings });
  } catch (error) { res.status(500).json({ message: 'Lỗi cập nhật cấu hình hệ thống' }); }
});

// Public Global Settings (Safe read for clients)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.getGlobal();
    res.json({
      bannerAnnouncement: settings.bannerAnnouncement,
      maintenanceMode: settings.maintenanceMode,
      commissionRate: settings.commissionRate,
      allowNewSellerRegistration: settings.allowNewSellerRegistration,
      codEnabled: settings.codEnabled,
      vnpayEnabled: settings.vnpayEnabled,
      haipayEnabled: settings.haipayEnabled,
      supportHotline: settings.supportHotline,
      supportEmail: settings.supportEmail
    });
  } catch (error) { res.status(500).json({ message: 'Lỗi tải cấu hình' }); }
});

app.get('/api/admin/posts', requireAdminJWT, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    let query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (status && status !== 'all') query.status = status;

    const posts = await Post.find(query)
      .populate('author', 'name username')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments(query);
    res.json({ posts, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

app.delete('/api/admin/posts/:id', requireAdminJWT, async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: 'Không tìm thấy bài đăng' });

    // Xoá bài đăng khỏi mảng cart & favorites của mọi users
    await mongoose.model('User').updateMany({}, {
      $pull: {
        cart: { product: deletedPost._id },
        favorites: deletedPost._id
      }
    });

    res.json({ message: 'Đã xóa bài đăng và dữ liệu liên quan thành công!' });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

// Use requireAdmin (EJS) for old views, but since they want React, eventually these will be deprecated
app.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const postCount = await Post.countDocuments();
    const userCount = await User.countDocuments();
    const pendingCount = await Post.countDocuments({ status: 'PENDING' });


    const revenues = await Revenue.find().sort({ createdAt: -1 });
    const totalRevenue = revenues.reduce((sum, item) => sum + item.commissionAmount, 0);


    const recentRevenues = await Revenue.find()
      .populate({
        path: 'orderId',
        populate: { path: 'buyer', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPending = await Post.find({ status: 'PENDING' }).populate('author', 'name email').sort({ createdAt: -1 }).limit(5);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    res.render('dashboard', {
      stats: { postCount, userCount, pendingCount, revenue: totalRevenue },
      recentPending,
      recentUsers,
      recentRevenues,
      active: 'dashboard'
    });
  } catch (error) {
    res.render('dashboard', { stats: { postCount: 0, userCount: 0, pendingCount: 0, revenue: 0 }, recentPending: [], recentUsers: [], recentRevenues: [] });
  }
});

app.get('/admin/withdrawals', async (req, res) => {
  try {


    const withdrawalsData = await Transaction.find({ type: 'Rút tiền', status: 'Đang xử lý' }).populate('user');

    res.render('withdrawals', {
      withdrawals: withdrawalsData,
      active: 'withdrawals'
    });
  } catch (error) {
    console.error("Lỗi khi tải trang quản lý rút tiền:", error);
    res.status(500).send("Đã xảy ra lỗi trên server");
  }
});

app.get('/admin/chat', requireAdmin, (req, res) => {
  res.render('admin-chat', { active: 'chat' });
});

app.get('/users', requireAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    let query = {};
    if (searchQuery) query = { $or: [{ name: { $regex: searchQuery, $options: 'i' } }, { email: { $regex: searchQuery, $options: 'i' } }] };
    const users = await User.find(query).sort({ createdAt: -1 });
    res.render('users', { users, searchQuery });
  } catch (error) { res.render('users', { users: [], searchQuery: '' }); }
});

app.get('/admin/seller-applications', requireAdmin, async (req, res) => {
  try {
    const applications = await User.find({ sellerStatus: { $in: ['pending', 'approved', 'rejected'] } })
      .select('-password')
      .sort({ sellerAppliedAt: -1, updatedAt: -1 });
    res.render('seller-applications', { applications, active: 'sellers' });
  } catch (error) {
    res.render('seller-applications', { applications: [], active: 'sellers' });
  }
});

app.post('/admin/approve-seller/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.isSeller = true;
      user.sellerStatus = 'approved';
      user.sellerApprovedAt = new Date();
      user.sellerRejectionReason = '';
      if (!user.shopInfo || !user.shopInfo.shopName) {
        user.shopInfo = { ...(user.shopInfo || {}), shopName: user.name, avatar: user.avatar || '' };
      }
      await user.save();
    }
  } catch (e) { }
  res.redirect('/admin/seller-applications');
});

app.post('/admin/reject-seller/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.isSeller = false;
      user.sellerStatus = 'rejected';
      user.sellerRejectionReason = 'Hồ sơ chưa đủ điều kiện';
      await user.save();
    }
  } catch (e) { }
  res.redirect('/admin/seller-applications');
});

app.get('/users/delete/:id', requireAdmin, async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.redirect('/users'); } catch (e) { res.redirect('/users'); }
});

app.get('/posts', requireAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    let query = {};
    if (searchQuery) query = { title: { $regex: searchQuery, $options: 'i' } };
    const posts = await Post.find(query).populate('author', 'name email').sort({ createdAt: -1 });
    res.render('posts', { posts, searchQuery });
  } catch (error) { res.render('posts', { posts: [], searchQuery: '' }); }
});

// Replace existing /api/admin/orders with JWT auth and pagination
app.get('/api/admin/orders', requireAdminJWT, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;

    const orders = await Order.find(query)
      .populate('buyer', 'name username')
      .populate('seller', 'name username')
      .populate('items')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);
    res.status(200).json({ orders, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});


app.get('/posts/delete/:id', requireAdmin, async (req, res) => {
  try { await Post.findByIdAndUpdate(req.params.id, { status: 'DELETED' }); res.redirect('/posts'); } catch (e) { res.redirect('/posts'); }
});


app.get('/posts/approve/:id', requireAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Không tìm thấy bài viết");


    post.status = 'APPROVED';
    await post.save();


    await UserNotification.create({
      user: post.author,
      title: '✅ Tin đăng đã được duyệt!',
      message: `Tin đăng "${post.title}" của bạn đã chính thức hiển thị trên chợ. Chúc bạn mau chốt đơn nhé!`,
      link: `/post/${post._id}`
    });

    res.redirect('/posts');
  } catch (error) {
    res.status(500).send("Lỗi server khi duyệt bài");
  }
});

app.get('/orders', requireAdmin, async (req, res) => {
  try {

    const orders = await Order.find()
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 });
    res.render('orders', { orders });
  } catch (error) {
    res.render('orders', { orders: [] });
  }
});

app.post('/orders/update-status/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.redirect('/orders');
  } catch (error) { res.redirect('/orders'); }
});

app.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('categories', { categories });
  } catch (error) {
    res.render('categories', { categories: [] });
  }
});

app.post('/categories/add', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const newCategory = new Category({
      name: req.body.name,
      description: req.body.description,
      image: req.file ? req.file.path : ''
    });
    await newCategory.save();
    res.redirect('/categories');
  } catch (error) { res.redirect('/categories'); }
});

app.get('/categories/edit/:id', requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.redirect('/categories');
    res.render('edit-category', { category });
  } catch (error) { res.redirect('/categories'); }
});

app.post('/categories/edit/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const updateData = { name: req.body.name, description: req.body.description };
    if (req.file) updateData.image = req.file.path;
    await Category.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/categories');
  } catch (error) { res.redirect('/categories'); }
});


app.post('/orders/update-status/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Không tìm thấy đơn hàng");


    if (order.status === 'Đã thanh toán cho người bán' || order.status === 'Đã hủy') {
      return res.status(400).send(`
                <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                    <h2 style="color: red;">⛔ LỖI BẢO MẬT HỆ THỐNG</h2>
                    <p>Không thể thay đổi trạng thái của đơn hàng đã được CHỐT SỔ hoặc ĐÃ HỦY!</p>
                    <a href="/orders" style="padding: 10px 20px; background: #333; color: white; text-decoration: none; border-radius: 5px;">Quay lại</a>
                </div>
            `);
    }


    order.status = req.body.status;
    await order.save();


    res.redirect('/orders');
  } catch (error) {
    res.status(500).send("Lỗi server khi cập nhật trạng thái");
  }
});


app.post('/api/admin/release-funds/:orderId', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });


    const current = canonicalStatus(order.status);
    if (!['Completed', 'Delivered', 'Hoàn thành'].includes(current) && order.status !== 'Hoàn thành') {
      return res.status(400).json({ message: "Chỉ giải ngân khi đơn hàng đã Delivered / Completed!" });
    }

    const platformFee = order.totalPrice * 0.05;
    const sellerReceive = order.totalPrice - platformFee;
    const sellerRef = orderSellerId(order);

    const seller = await User.findById(sellerRef);
    if (!seller) return res.status(404).json({ message: 'Không tìm thấy Seller' });
    seller.pendingBalance = Math.max(0, (seller.pendingBalance || 0) - sellerReceive);
    seller.walletBalance = (seller.walletBalance || 0) + sellerReceive;
    await seller.save();

    const newRevenue = new Revenue({
      orderId: order._id,
      commissionAmount: platformFee,
      description: `Thu chiết khấu 5% từ đơn hàng #${order._id.toString().slice(-6).toUpperCase()}`
    });
    await newRevenue.save();

    order.status = 'Completed';
    order.paymentStatus = 'released';
    order.completedAt = order.completedAt || new Date();
    await order.save();

    await UserNotification.create({
      user: sellerRef,
      title: '💰 Tiền đã về ví HaiPay!',
      message: `Tuyệt vời! Bạn vừa được giải ngân ${sellerReceive.toLocaleString('vi-VN')}đ từ đơn hàng #${order._id.toString().slice(-6).toUpperCase()} (Đã trừ 5% phí sàn).`,
      link: '/haipay'
    });

    res.json({ message: "Giải ngân và bắn thông báo thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống khi giải ngân" });
  }
});


app.post('/api/admin/refund-order/:orderId', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });


    const current = canonicalStatus(order.status);
    if (current !== 'Cancelled' && order.status !== 'Đã hủy (Chờ hoàn tiền)' && order.paymentStatus !== 'escrow') {
      return res.status(400).json({ message: "Đơn hàng này không ở trạng thái chờ hoàn tiền!" });
    }

    const buyer = await User.findById(orderBuyerId(order));
    if (buyer) {
      buyer.walletBalance = (buyer.walletBalance || 0) + order.totalPrice;
      await buyer.save();


      await Transaction.create({
        user: buyer._id,
        type: 'Hoàn tiền',
        amount: order.totalPrice,
        status: 'Thành công',
        description: `Hoàn tiền từ đơn hàng đã hủy #${order._id.toString().slice(-6).toUpperCase()}`
      });


      await UserNotification.create({
        user: buyer._id,
        title: '💸 Đã nhận được tiền hoàn!',
        message: `Hệ thống đã hoàn lại ${order.totalPrice.toLocaleString('vi-VN')}đ vào ví HaiPay của bạn từ đơn hàng bị hủy #${order._id.toString().slice(-6).toUpperCase()}.`,
        link: '/haipay'
      });
    }


    order.status = 'Cancelled';
    order.paymentStatus = 'refunded';
    order.cancelledAt = order.cancelledAt || new Date();
    await order.save();

    res.json({ message: "✅ Hoàn tiền thành công và đã cộng vào ví HaiPay của người mua!" });
  } catch (error) {
    console.error("Lỗi hoàn tiền:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi hoàn tiền" });
  }
});


app.get('/admin/revenue', requireAdmin, async (req, res) => {
  try {

    const revenueList = await Revenue.find()
      .populate({
        path: 'orderId',
        populate: { path: 'buyer', select: 'name' }
      })
      .sort({ createdAt: -1 });


    const totalRevenue = revenueList.reduce((sum, item) => sum + item.commissionAmount, 0);

    res.render('revenue', { revenueList, totalRevenue });
  } catch (error) {
    res.redirect('/dashboard');
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: "Không tìm thấy bài đăng để xóa" });

    // Fix Orphaned Records: Remove the deleted post from all carts and favorites
    await mongoose.model('User').updateMany({}, {
      $pull: {
        cart: { product: deletedPost._id },
        favorites: deletedPost._id
      }
    });

    res.status(200).json({ message: "Đã trảm thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi Server khi xóa bài" });
  }
});

app.get('/api/admin/notifications', async (req, res) => {
  try {
    const adminFilter = {
      $or: [
        { targetRole: 'admin' },
        { recipientRole: 'admin' },
        { type: { $in: ['SELLER', 'PRODUCT', 'WITHDRAWAL', 'REPORT'] } }
      ]
    };
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const notifs = await Notification.find(adminFilter).sort({ createdAt: -1 }).limit(limit);
    const unreadCount = await Notification.countDocuments({ ...adminFilter, isRead: false });
    res.json({ notifications: notifs, unreadCount });
  } catch (error) { res.status(500).json({ error: "Lỗi: " + error.message }); }
});


app.post('/api/admin/notifications/read', async (req, res) => {
  try {
    const adminFilter = {
      $or: [
        { targetRole: 'admin' },
        { recipientRole: 'admin' },
        { type: { $in: ['SELLER', 'PRODUCT', 'WITHDRAWAL', 'REPORT'] } }
      ]
    };
    await Notification.updateMany({ ...adminFilter, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Lỗi cập nhật thông báo: " + error.message });
  }
});


app.get('/admin/reports', requireAdmin, async (req, res) => {
  try {

    const reports = await Report.find()
      .populate('reporter', 'name')
      .populate('post', 'title')
      .sort({ createdAt: -1 });


    res.render('reports', {
      reports,
      active: 'reports',
      user: req.session.user
    });
  } catch (error) {
    res.status(500).send("Lỗi tải trang báo cáo");
  }
});

app.get('/api/admin/contact', async (req, res) => {
  try {

    const admin = await User.findOne({ role: 'Admin' }).select('_id name avatar email');
    if (!admin) return res.status(404).json({ message: "Chưa có Admin nào trong hệ thống!" });
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin Admin" });
  }
});

app.get('/api/admin/unread-chats', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'Admin' });
    if (!admin) return res.json({ count: 0 });
    const count = await Message.countDocuments({ receiver: admin._id, isRead: false });
    res.json({ count });
  } catch (error) { res.json({ count: 0 }); }
});


app.get('/api/admin/test-notif', async (req, res) => {
  try {
    const notif = await sendAdminNotification(
      '🔔 Thông báo Test Hệ thống',
      'Tuyệt vời! Hệ thống chuông báo của Admin đang hoạt động rất trơn tru!',
      '/dashboard',
      'SYSTEM'
    );
    res.json({ message: "Đã bắn thông báo test!", notif });
  } catch (error) { res.status(500).json({ error: "Lỗi: " + error.message }); }
});


app.put('/api/admin/withdraw/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    await Transaction.findByIdAndUpdate(id, { status: 'success' });
    res.json({ message: 'Đã duyệt lệnh rút tiền thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi duyệt lệnh' });
  }
});

app.get('/users/edit/:id', async (req, res) => {
  try {
    const user = await mongoose.model('User').findById(req.params.id);
    if (!user) return res.redirect('/users');
    res.render('edit-user', { user });
  } catch (err) {
    res.status(500).send("Lỗi tìm người dùng");
  }
});


app.post('/users/edit/:id', async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    await mongoose.model('User').findByIdAndUpdate(req.params.id, { name, email, phone, role });
    res.redirect('/users');
  } catch (err) {
    res.status(500).send("Lỗi cập nhật người dùng");
  }
});





app.get('/api/users/search', async (req, res) => {
  try {
    const query = req.query.q;
    const excludeId = req.query.exclude;
    if (!query || query.trim() === '') return res.status(200).json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: excludeId } },
        { $or: [{ name: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }] }
      ]
    }).select('name email avatar');
    res.status(200).json(users);
  } catch (error) { res.status(500).json({ message: 'Lỗi server khi tìm kiếm' }); }
});

app.put('/api/users/change-password/:id', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (user.password !== oldPassword) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng!' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' }); }
});

app.post('/api/users/forgot-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản!' });
    if (!user.phone) return res.status(400).json({ message: 'Chưa cập nhật SĐT, liên hệ Admin.' });
    if (user.phone !== phone) return res.status(400).json({ message: 'SĐT không chính xác!' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Lấy lại mật khẩu thành công!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password, anonymousId } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    if (user.status === 'locked' || user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.' });
    }
    const safe = sanitizeUser(user);
    const token = signUserToken(user);

    // Merge anonymous browsing events if anonymousId was passed
    if (anonymousId && typeof anonymousId === 'string') {
      setImmediate(() => {
        mergeUserIdentity(anonymousId, user._id).catch((e) => console.warn('Login merge warning:', e.message));
      });
    }

    res.status(200).json({ ...safe, token });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi đăng nhập: ' + err.message });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    // 1. Strict Input Sanitization: Whitelist ONLY safe fields
    const { name, phone, address, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Điền đủ Họ tên, Email, Mật khẩu!' });

    // 2. Privilege Escalation Guard: Reject any attempt to pass Admin roles or privileges
    const requestedRole = req.body.role || req.body.roles;
    if (requestedRole && /(admin|quản trị|root|superuser)/i.test(String(requestedRole))) {
      return res.status(403).json({ message: 'Không được phép chỉ định vai trò Quản trị viên!' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) return res.status(400).json({ message: 'Email này đã được sử dụng!' });

    // 3. Force default safe role ('Khách hàng') and reset seller flags
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      role: 'Khách hàng', // Strictly forced safe default
      sellerStatus: 'none',
      isSeller: false
    });
    await newUser.save();

    // Merge anonymous browsing events if anonymousId was passed
    if (req.body.anonymousId && typeof req.body.anonymousId === 'string') {
      setImmediate(() => {
        mergeUserIdentity(req.body.anonymousId, newUser._id).catch((e) => console.warn('Register merge warning:', e.message));
      });
    }

    const safe = sanitizeUser(newUser);
    res.status(201).json({ message: 'Đăng ký thành công', user: { ...safe, token: signUserToken(newUser) } });
  } catch (error) { res.status(500).json({ message: 'Lỗi server khi đăng ký' }); }
});

app.get('/api/users/profile', async (req, res) => {
  try {
    let userId = req.query.id || req.query.userId || req.headers['userid'];

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        if (decoded && (decoded.id || decoded._id)) {
          userId = decoded.id || decoded._id;
        }
      } catch (tokenErr) { }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng cung cấp User ID hoặc Token xác thực' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'User ID không hợp lệ' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng trong hệ thống' });
    }

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin cá nhân' });
  }
});

app.put('/api/users/profile/:id', upload.single('avatar'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) updateData.avatar = req.file.path;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    res.status(200).json(sanitizeUser(updatedUser));
  } catch (err) { res.status(500).json({ message: 'Lỗi cập nhật' }); }
});

app.get('/api/posts', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[DB WARNING] Truy vấn /api/posts khi MongoDB chưa hoàn tất kết nối (readyState: ' + mongoose.connection.readyState + ')');
      return res.status(200).json([]);
    }

    const { page = 1, limit = 8, category, search, location, sort, minPrice, maxPrice } = req.query;
    let query = { status: { $in: CATALOG_VISIBLE } };

    if (category && category !== 'Tất cả' && category !== 'Kết quả tìm kiếm') {
      query.category = String(category).trim();
    }

    if (search && String(search).trim()) {
      const escapedSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { name: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    if (location && location !== 'Toàn quốc' && location !== 'Tất cả khu vực') {
      const escapedLocation = String(location).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.location = { $regex: escapedLocation, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      const numMin = Number(minPrice);
      const numMax = Number(maxPrice);
      if (!isNaN(numMin) && numMin >= 0) query.price.$gte = numMin;
      if (!isNaN(numMax) && numMax > 0) query.price.$lte = numMax;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 8);

    const posts = await Post.find(query)
      .populate('author sellerId', 'name avatar shopInfo isSeller sellerStatus')
      .sort(sortOption)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    res.status(200).json(posts || []);
  } catch (error) {
    console.error("Lỗi lọc bài đăng (/api/posts):", error.message);
    res.status(200).json([]);
  }
});

app.get('/api/posts/:id', async (req, res, next) => {
  try {
    if (req.params.id === 'user' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next();
    }
    const post = await Post.findById(req.params.id)
      .populate('author sellerId', 'name avatar phone email createdAt shopInfo isSeller sellerStatus');
    res.status(200).json(post);
  } catch (error) { res.status(500).json({ message: 'Lỗi' }); }
});

app.put('/api/posts/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { title, price, category, location, description, quantity, details } = req.body;
    let updateData = { title, price, category, location, description, quantity };

    if (details) {
      try {
        updateData.details = JSON.parse(details);
        if (updateData.details.condition) updateData.condition = updateData.details.condition;
      } catch (e) { }
    }

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => file.path || file.filename);
    }

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json(updatedPost);
  } catch (error) { res.status(500).json({ message: "Lỗi Server: " + error.message }); }
});

// ==========================================
// VNPAY CONFIGURATION & HELPERS
// ==========================================
const vnp_TmnCode = process.env.VNP_TMNCODE || "IYQYHLU4";
const vnp_HashSecret = process.env.VNP_HASHSECRET || "BBZJECZFZLUQSVOBCVTQSPDPYQZKGUEB";
const vnp_Url = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = process.env.VNP_RETURNURL || "http://localhost:3000/haipay/return";

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

function verifyVnpayChecksum(params, secureHash) {
  if (!secureHash) return true;
  let vnp_Params = { ...params };
  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", vnp_HashSecret);
  let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

  return secureHash.toLowerCase() === signed.toLowerCase();
}

function buildVnpayPaymentUrl({ orderId, amount, ipAddr = '127.0.0.1', orderInfo, returnUrl }) {
  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');

  let vnp_Params = {
    'vnp_Version': '2.1.0',
    'vnp_Command': 'pay',
    'vnp_TmnCode': vnp_TmnCode,
    'vnp_Locale': 'vn',
    'vnp_CurrCode': 'VND',
    'vnp_TxnRef': orderId.toString(),
    'vnp_OrderInfo': orderInfo || ('Thanh toan don hang HaiHand ' + orderId),
    'vnp_OrderType': 'other',
    'vnp_Amount': Math.round(Number(amount) * 100),
    'vnp_ReturnUrl': returnUrl || vnp_ReturnUrl,
    'vnp_IpAddr': ipAddr,
    'vnp_CreateDate': createDate
  };

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
  vnp_Params['vnp_SecureHash'] = signed;

  return vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
}

// ==========================================
// CHECKOUT CONTROLLER (POST /api/users/:userId/checkout & /api/checkout)
// ==========================================
app.post('/api/users/:userId/checkout', protect, (req, res, next) => {
  if (!req.user._id.equals(req.params.userId) && req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Không thể tiến hành đặt hàng thay cho tài khoản khác' });
  }
  req.body.userId = req.params.userId;
  return processCheckout(req, res, next);
});

app.get('/api/users/public-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: "ID không hợp lệ" });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    let followersCount = 0;
    let followingCount = 0;
    try {
      followersCount = await Follow.countDocuments({ following: userId });
      followingCount = await Follow.countDocuments({ follower: userId });
    } catch (err) { console.log("Lỗi đếm follow:", err.message); }

    const posts = await Post.find({ author: userId }).sort({ createdAt: -1 });
    const reviews = await Review.find({ seller: userId }).populate('buyer', 'name avatar');
    let avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 5.0;

    const conversationsReceived = await Message.distinct('sender', { receiver: userId });
    let repliedCount = 0;
    for (const senderId of conversationsReceived) {
      const hasReplied = await Message.exists({ sender: userId, receiver: senderId });
      if (hasReplied) repliedCount++;
    }
    const responseRate = conversationsReceived.length > 0 ? Math.round((repliedCount / conversationsReceived.length) * 100) : 100;

    return res.status(200).json({ user, posts, reviews, followersCount, followingCount, avgRating, responseRate });
  } catch (error) {
    console.error("Lỗi sập Profile:", error.message);

    return res.status(200).json({ user: {}, posts: [], reviews: [], followersCount: 0, followingCount: 0, avgRating: 5 });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { seller, buyer, rating, comment, orderId } = req.body;


    const order = await Order.findById(orderId);
    if (order.isReviewed) return res.status(400).json({ message: "Đơn hàng này đã được đánh giá rồi!" });


    const newReview = new Review({ seller, buyer, rating, comment, orderId });
    await newReview.save();


    order.isReviewed = true;
    await order.save();

    res.status(200).json({ message: "Đánh giá thành công!" });
  } catch (error) { res.status(500).json({ error: "Lỗi gửi đánh giá" }); }
});

app.get('/api/users/follow-status', async (req, res) => {
  try {
    const { followerId, followingId } = req.query;


    if (!followerId || followerId === 'undefined' || !mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(200).json({ isFollowing: false });
    }
    if (!followingId || followingId === 'undefined' || !mongoose.Types.ObjectId.isValid(followingId)) {
      return res.status(200).json({ isFollowing: false });
    }

    const follow = await Follow.findOne({ follower: followerId, following: followingId });
    return res.status(200).json({ isFollowing: !!follow });
  } catch (e) {
    console.error("Lỗi API follow-status:", e.message);

    return res.status(200).json({ isFollowing: false });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const { role, scope, type, limit } = req.query;

    // 1. Admin portal scope: Return ONLY admin/system-level notifications
    if (scope === 'admin' || role === 'admin') {
      const adminFilter = {
        $or: [
          { targetRole: 'admin' },
          { recipientRole: 'admin' },
          { type: { $in: ['SELLER', 'PRODUCT', 'WITHDRAWAL', 'REPORT'] } }
        ]
      };
      if (type) {
        adminFilter.type = type;
      }
      const maxLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
      const notifs = await Notification.find(adminFilter).sort({ createdAt: -1 }).limit(maxLimit);
      const unreadCount = await Notification.countDocuments({ ...adminFilter, isRead: false });

      return res.json({
        notifications: notifs,
        unreadCount,
        unreadByType: {}
      });
    }

    let userId = req.headers['userid'] || req.query.userId;
    if (!userId && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || 'secret123');
        userId = decoded.id || decoded._id;
      } catch (e) {}
    }

    if (!userId) {
      return res.json({ notifications: [], unreadCount: 0, unreadByType: {} });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Base query for personal user notifications (strictly exclude admin notifications)
    const baseQuery = {
      $or: [
        { userId: userObjectId },
        { user: userObjectId },
        { shopId: userObjectId }
      ],
      targetRole: { $ne: 'admin' },
      recipientRole: { $ne: 'admin' }
    };

    // Filter by role context if requested
    if (role === 'seller') {
      baseQuery.$and = [
        {
          $or: [
            { recipientRole: 'seller' },
            { targetRole: 'seller' },
            { shopId: userObjectId },
            { type: { $in: ['NEW_ORDER', 'SELLER'] } }
          ]
        }
      ];
    } else if (role === 'buyer') {
      baseQuery.$and = [
        {
          $or: [
            { recipientRole: 'buyer' },
            { targetRole: 'buyer' },
            { recipientRole: { $exists: false } },
            { type: { $in: ['ORDER', 'ORDER_STATUS', 'PAYMENT', 'MESSAGE', 'SYSTEM'] } }
          ]
        }
      ];
    }

    // Optional type filter
    if (type) {
      baseQuery.type = type;
    }

    const maxLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const notifs = await Notification.find(baseQuery).sort({ createdAt: -1 }).limit(maxLimit);
    const unreadCount = await Notification.countDocuments({ ...baseQuery, isRead: false });

    // Aggregate unread notifications grouped by type for sidebar badges
    const unreadGroupQuery = {
      $or: [
        { userId: userObjectId },
        { user: userObjectId },
        { shopId: userObjectId }
      ],
      targetRole: { $ne: 'admin' },
      recipientRole: { $ne: 'admin' },
      isRead: false
    };
    if (role === 'seller') {
      unreadGroupQuery.$and = [
        {
          $or: [
            { recipientRole: 'seller' },
            { targetRole: 'seller' },
            { shopId: userObjectId },
            { type: { $in: ['NEW_ORDER', 'SELLER'] } }
          ]
        }
      ];
    }

    const unreadGroupAgg = await Notification.aggregate([
      { $match: unreadGroupQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const unreadByType = {};
    unreadGroupAgg.forEach(item => {
      if (item._id) unreadByType[item._id] = item.count;
    });

    res.json({
      notifications: notifs,
      unreadCount,
      unreadByType
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thông báo:', error);
    res.status(500).json({ error: "Lỗi lấy danh sách thông báo: " + error.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID thông báo không hợp lệ" });
    }
    const updated = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json({ success: true, notification: updated });
  } catch (error) {
    res.status(500).json({ error: "Lỗi cập nhật thông báo" });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    let userId = req.headers['userid'] || req.body.userId || req.query.userId;
    if (!userId && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || 'secret123');
        userId = decoded.id || decoded._id;
      } catch (e) {}
    }

    if (!userId) {
      return res.status(400).json({ error: "Thiếu userId" });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const { role, type } = req.body;

    const filter = {
      $or: [
        { userId: userObjectId },
        { user: userObjectId },
        { shopId: userObjectId }
      ],
      targetRole: { $ne: 'admin' },
      recipientRole: { $ne: 'admin' },
      isRead: false
    };

    if (type) {
      filter.type = type;
    }

    if (role === 'seller') {
      filter.$and = [
        {
          $or: [
            { recipientRole: 'seller' },
            { shopId: userObjectId },
            { type: { $in: ['NEW_ORDER', 'SELLER'] } }
          ]
        }
      ];
    }

    const result = await Notification.updateMany(filter, { isRead: true });
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: "Lỗi cập nhật tất cả thông báo" });
  }
});

app.put('/api/notifications/read-by-type', async (req, res) => {
  try {
    let userId = req.headers['userid'] || req.body.userId || req.query.userId;
    if (!userId && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || 'secret123');
        userId = decoded.id || decoded._id;
      } catch (e) {}
    }

    const type = req.body.type || req.query.type;
    if (!userId || !type) {
      return res.status(400).json({ error: "Thiếu userId hoặc type" });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const filter = {
      $or: [
        { userId: userObjectId },
        { user: userObjectId },
        { shopId: userObjectId }
      ],
      type,
      isRead: false
    };

    const result = await Notification.updateMany(filter, { isRead: true });
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: "Lỗi cập nhật thông báo theo loại" });
  }
});
// ------------------------------------------


app.get('/api/users/:userId/transactions', async (req, res) => {
  try {
    const trans = await Transaction.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(trans);
  } catch (error) { res.status(500).json({ message: 'Lỗi lấy lịch sử' }); }
});

app.post('/api/users/:userId/withdraw', async (req, res) => {
  try {
    const { amount, bankName, bankAccount } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    if (amount < 50000) return res.status(400).json({ message: 'Số tiền rút tối thiểu là 50.000đ!' });
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Số dư ví không đủ để rút!' });

    user.walletBalance -= amount;
    await user.save();

    await Transaction.create({
      user: user._id, type: 'Rút tiền', amount: amount, status: 'Đang xử lý',
      description: `Rút tiền về NH: ${bankName} - STK: ${bankAccount}`
    });


    await UserNotification.create({
      user: user._id, title: '🏦 Đã tạo lệnh rút tiền!',
      message: `Lệnh rút ${amount.toLocaleString('vi-VN')}đ về tài khoản ${bankName} đang được xử lý. Tiền sẽ về trong 2-4 tiếng nữa nhé.`,
      link: '/haipay'
    });


    await sendAdminNotification(
      '💸 Yêu cầu rút tiền mới!',
      `Khách hàng ${user.name} vừa yêu cầu rút ${amount.toLocaleString('vi-VN')}đ. Bác mau vào kiểm tra và chuyển khoản nhé!`,
      '/admin/withdrawals',
      'WITHDRAWAL'
    );

    res.status(200).json({ message: 'Tạo lệnh rút tiền thành công!', user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống khi rút tiền' });
  }
});


app.post('/admin/posts/delete/:id', requireAdmin, async (req, res) => {
  try {
    const postId = req.params.id;


    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res.status(404).send("Không tìm thấy bài viết để xóa!");
    }


    await mongoose.models.Report.deleteMany({ post: postId });


    if (deletedPost.author) {
      await UserNotification.create({
        user: deletedPost.author,
        title: '🚫 Bài viết đã bị xóa!',
        message: `Bài viết "${deletedPost.title}" của bạn đã bị Admin xóa do vi phạm tiêu chuẩn cộng đồng.`,
        link: '/profile'
      });
    }

    // Fix Orphaned Records: Xoá bài đăng khỏi mảng cart & favorites của mọi users
    await mongoose.model('User').updateMany({}, {
      $pull: {
        cart: { product: postId },
        favorites: postId
      }
    });


    res.redirect('/admin/reports');
  } catch (error) {
    console.error("Lỗi xóa bài Admin:", error);
    res.status(500).send("Lỗi hệ thống khi xóa bài viết");
  }
});

app.get('/admin/orders', async (req, res) => {
  try {

    const orders = await Order.find()
      .populate('buyer', 'name email phone')
      .sort({ createdAt: -1 });

    res.render('orders', { orders });
  } catch (error) {
    res.status(500).send("Lỗi tải danh sách đơn hàng");
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { reporterId, postId, reason } = req.body;
    await Report.create({ reporter: reporterId, post: postId, reason });


    await sendAdminNotification(
      '🚩 Có báo cáo mới!',
      'Một bài đăng vừa bị người dùng báo cáo vi phạm. Hãy kiểm tra ngay!',
      '/admin/reports',
      'REPORT'
    );

    res.json({ message: "Đã gửi báo cáo thành công!" });
  } catch (e) { res.status(500).json({ error: "Lỗi" }); }
});

app.post('/admin/reports/ignore/:id', requireAdmin, async (req, res) => {
  try {

    await mongoose.models.Report.findByIdAndDelete(req.params.id);
    res.redirect('/admin/reports');
  } catch (error) {
    res.status(500).send("Lỗi khi bỏ qua báo cáo");
  }
});

app.post('/api/users/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    if (followerId === followingId) return res.status(400).json({ message: "Không thể tự theo dõi chính mình!" });

    const existingFollow = await Follow.findOne({ follower: followerId, following: followingId });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);
      return res.json({ message: "Đã bỏ theo dõi", isFollowing: false });
    } else {
      await Follow.create({ follower: followerId, following: followingId });

      await UserNotification.create({
        user: followingId,
        title: '👤 Có người theo dõi mới!',
        message: `Một người dùng vừa bắt đầu theo dõi bạn.`,
        link: `/public-profile/${followerId}`
      });
      return res.json({ message: "Đã theo dõi", isFollowing: true });
    }
  } catch (e) { res.status(500).json({ error: "Lỗi hệ thống" }); }
});

app.get('/api/users/:userId/follow-list', async (req, res) => {
  try {
    const { type } = req.query;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json([]);
    }

    let list = [];
    if (type === 'followers') {
      list = await mongoose.models.Follow.find({ following: userId }).populate('follower', 'name avatar email');
    } else {
      list = await mongoose.models.Follow.find({ follower: userId }).populate('following', 'name avatar email');
    }


    list = list.filter(item => item.follower && item.following);

    res.status(200).json(list);
  } catch (e) {
    console.error("Lỗi get follow list:", e.message);

    res.status(200).json([]);
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.status(200).json(sanitizeUser(user));
  } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
});






app.get('/api/orders/seller/:sellerId', protect, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const isOwner = req.user._id.equals
      ? req.user._id.equals(sellerId)
      : req.user._id.toString() === sellerId.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng của Shop này' });
    }

    const orders = await Order.find({ $or: [{ seller: sellerId }, { sellerId }] })
      .populate('buyer buyerId', 'name email phone address')
      .populate('items', 'title name price images image')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) { res.status(500).json({ error: 'Lỗi lấy đơn hàng của người bán' }); }
});


app.put('/api/orders/:orderId/confirm', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('seller sellerId buyer buyerId');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const sellerRef = orderSellerId(order);
    const isSellerOwner = sellerRef && (
      req.user._id.equals ? req.user._id.equals(sellerRef) : req.user._id.toString() === sellerRef.toString()
    );
    const isAdmin = req.user.role === 'Admin';

    if (!isSellerOwner && !isAdmin) {
      return res.status(403).json({ message: 'Đơn hàng này không thuộc Shop của bạn' });
    }

    const current = canonicalStatus(order.status);
    if (!['Pending'].includes(current)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ để xác nhận' });
    }
    order.status = 'Processing';
    await order.save();

    await Notification.create({
      title: '📦 Người bán đã chốt đơn!',
      message: `Shop đã xác nhận đơn hàng #${order._id.toString().slice(-6).toUpperCase()}.`,
      orderId: order._id
    });

    res.status(200).json({ message: 'Đã xác nhận đơn hàng!', order });
  } catch (error) { res.status(500).json({ message: 'Lỗi xác nhận đơn' }); }
});


app.put('/api/orders/:orderId/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const buyerRef = orderBuyerId(order);
    const sellerRef = orderSellerId(order);

    const isBuyerOwner = buyerRef && (
      req.user._id.equals ? req.user._id.equals(buyerRef) : req.user._id.toString() === buyerRef.toString()
    );
    const isSellerOwner = sellerRef && (
      req.user._id.equals ? req.user._id.equals(sellerRef) : req.user._id.toString() === sellerRef.toString()
    );
    const isAdmin = req.user.role === 'Admin';

    if (!isBuyerOwner && !isSellerOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này' });
    }

    const current = canonicalStatus(order.status);
    if (current === 'Cancelled') return res.status(400).json({ message: 'Đơn này đã bị hủy từ trước rồi!' });
    if (['Shipped', 'Delivered', 'Completed'].includes(current)) {
      return res.status(400).json({ message: 'Đơn hàng đang giao hoặc đã hoàn thành, không thể hủy!' });
    }

    if (isEscrow(order) || order.paymentStatus === 'escrow') {
      await User.findByIdAndUpdate(orderBuyerId(order), {
        $inc: { walletBalance: order.totalPrice }
      });
      const sellerIdRef = orderSellerId(order);
      if (sellerIdRef) {
        await User.findByIdAndUpdate(sellerIdRef, {
          $inc: { pendingBalance: -(order.totalPrice * 0.95) }
        });
      }
      order.paymentStatus = 'refunded';
    }

    const qtyByProduct = {};
    (order.orderItems || []).forEach((item) => {
      if (item.productId) qtyByProduct[item.productId.toString()] = item.quantity || 1;
    });
    for (let postId of (order.items || [])) {
      const post = await Post.findById(postId);
      if (post) {
        const add = qtyByProduct[postId.toString()] || 1;
        const nextStock = (post.stockQuantity ?? post.quantity ?? 0) + add;
        post.stockQuantity = nextStock;
        post.quantity = nextStock;
        if (post.status === 'out_of_stock' || post.status === 'SOLD') post.status = 'active';
        await post.save();
      }
    }

    order.status = 'Cancelled';
    order.cancelledAt = new Date();
    await order.save();

    res.status(200).json({ message: '✅ Đã hủy đơn, hoàn tiền vào ví (nếu có) và trả hàng lại vào kho thành công!' });
  } catch (error) {
    console.error("Lỗi hủy đơn:", error);
    res.status(500).json({ message: 'Lỗi hệ thống khi hủy đơn' });
  }
});


app.put('/api/orders/:orderId/receive', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const buyerRef = orderBuyerId(order);
    const isBuyerOwner = buyerRef && (
      req.user._id.equals ? req.user._id.equals(buyerRef) : req.user._id.toString() === buyerRef.toString()
    );
    const isAdmin = req.user.role === 'Admin';

    if (!isBuyerOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không phải là người mua của đơn hàng này' });
    }

    const current = canonicalStatus(order.status);
    if (!['Shipped', 'Delivered'].includes(current)) {
      return res.status(400).json({ message: 'Đơn hàng chưa được giao, không thể xác nhận!' });
    }

    order.status = current === 'Shipped' ? 'Delivered' : 'Completed';
    if (order.status === 'Delivered') order.deliveredAt = new Date();
    if (order.status === 'Completed') order.completedAt = new Date();
    await order.save();
    res.status(200).json({ message: 'Cảm ơn bạn đã xác nhận nhận hàng!', order });
  } catch (error) { res.status(500).json({ error: 'Lỗi xác nhận' }); }
});

app.get('/api/users/:userId/orders', protect, async (req, res) => {
  try {
    const userId = req.params.userId;
    const isOwner = req.user._id.equals
      ? req.user._id.equals(userId)
      : req.user._id.toString() === userId.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng của người dùng này' });
    }

    const orders = await Order.find({ $or: [{ buyer: userId }, { buyerId: userId }] })
      .populate('items')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) { res.status(500).json({ error: 'Lỗi lấy đơn hàng' }); }
});

app.post('/api/users/favorites', async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.favorites) user.favorites = [];
    const postIdStr = req.body.postId.toString();
    const index = user.favorites.findIndex(id => id.toString() === postIdStr);

    let isAdded = false;
    if (index === -1) {
      user.favorites.push(req.body.postId);
      isAdded = true;
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();

    // Server-side favorite event tracking
    try {
      recordServerEvent({
        userId: user._id,
        type: isAdded ? 'favorite_add' : 'favorite_remove',
        productId: req.body.postId,
        source: 'favorites'
      });
    } catch (e) {}

    res.status(200).json({ message: 'Ok', favorited: isAdded });
  } catch (error) { res.status(500).json({ error: 'Lỗi' }); }
});

app.get('/api/users/favorites/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('favorites');
    res.status(200).json(user ? user.favorites : []);
  } catch (error) { res.status(200).json([]); }
});

app.post('/api/posts', protect, isSeller, upload.array('images', 5), async (req, res) => {
  try {
    const { title, name, price, category, location, description, quantity, stockQuantity, details, sku } = req.body;
    const displayName = (name || title || '').trim();

    if (!displayName || !price || !category) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên, giá và danh mục sản phẩm!' });
    }

    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => file.path || file.secure_url || file.filename);
    }

    let parsedDetails = {};
    let condition = 'Mới';
    if (details) {
      try {
        parsedDetails = JSON.parse(details);
        if (parsedDetails.condition) condition = parsedDetails.condition;
      } catch (e) { }
    }

    const stock = Number(stockQuantity != null ? stockQuantity : quantity) || 1;

    // Check Auto-Approve setting from GlobalSetting
    let isAutoApprove = false;
    try {
      const Settings = require('./models/Settings');
      const setting = await Settings.findOne();
      isAutoApprove = setting && setting.autoApprovePosts === true;
    } catch(e) {}

    const initialStatus = stock <= 0 ? 'out_of_stock' : (isAutoApprove ? 'active' : 'pending');

    const newPost = new Post({
      name: displayName,
      title: displayName,
      sku: sku || '',
      price: Number(price),
      category,
      location: location || '',
      description: description || '',
      quantity: stock,
      stockQuantity: stock,
      images: imagePaths,
      author: req.user._id,
      sellerId: req.user._id,
      status: initialStatus,
      condition,
      details: parsedDetails
    });

    await newPost.save();

    try {
      await indexProductImage(newPost);
    } catch (error) {
      console.warn(`Không tạo được image embedding cho ${newPost._id}: ${error.message}`);
    }

    // Trigger 1: When a user creates a new Product/Post (and auto-approve is false), automatically create a notification for Admins
    if (!isAutoApprove && initialStatus === 'pending') {
      try {
        await sendAdminNotification(
          'Tin đăng mới',
          'Có tin đăng mới chờ duyệt!',
          '/posts',
          'PRODUCT'
        );
      } catch (e) {
        console.error('Lỗi tạo thông báo duyệt tin:', e);
      }
    }

    res.status(201).json({ message: 'Đã tạo sản phẩm.', post: newPost, product: newPost });
  } catch (error) {
    console.error("Lỗi đăng sản phẩm:", error);
    res.status(500).json({ message: error.message || 'Lỗi server khi tạo sản phẩm' });
  }
});

app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({
      $or: [{ author: req.params.userId }, { sellerId: req.params.userId }]
    }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) { res.status(500).json({ message: 'Lỗi server khi lấy tin cá nhân' }); }
});

app.get('/api/users/cart/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(200).json([]);
    }
    const user = await User.findById(req.params.userId);
    if (!user || !user.cart) return res.status(200).json([]);

    let cartWithDetails = [];
    for (let item of user.cart) {
      const postDetail = await Post.findById(item.product).populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus');
      if (postDetail) cartWithDetails.push({ product: postDetail, quantity: item.quantity });
    }
    res.status(200).json(cartWithDetails);
  } catch (error) { res.status(200).json([]); }
});

app.delete('/api/users/cart/clear/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (user) { user.cart = []; await user.save(); }
    res.status(200).json([]);
  } catch (error) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.delete('/api/users/cart/:userId/:postId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    user.cart = user.cart.filter(item => item.product && item.product.toString() !== req.params.postId);
    await user.save();

    // Server-side cart event tracking
    try {
      recordServerEvent({
        userId: user._id,
        type: 'cart_add',
        productId: postId,
        source: 'cart',
        meta: { quantity }
      });
    } catch (e) {}

    res.status(200).json(user.cart);
  } catch (error) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/users/cart', async (req, res) => {
  try {
    const { userId, postId, quantity } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    if (!user.cart) user.cart = [];

    const itemIndex = user.cart.findIndex(item => item.product && item.product.toString() === postId);
    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += quantity;
    } else {
      user.cart.push({ product: postId, quantity });
    }
    await user.save();

    // Server-side cart event tracking
    try {
      recordServerEvent({
        userId: user._id,
        type: 'cart_add',
        productId: postId,
        source: 'cart',
        meta: { quantity }
      });
    } catch (e) {}

    res.status(200).json(user.cart);
  } catch (error) { res.status(500).json({ message: "Lỗi Server" }); }
});







app.get('/api/messages/clear-all', async (req, res) => {
  try {
    await Message.deleteMany({});
    res.status(200).send("<h1 style='color:green; text-align:center; margin-top:50px;'>✅ ĐÃ DỌN SẠCH RÁC TIN NHẮN!</h1>");
  } catch (e) { res.status(500).send("Lỗi dọn rác!"); }
});

app.get('/api/messages/conversations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const messages = await Message.find({ $or: [{ sender: userId }, { receiver: userId }] })
      .sort({ timestamp: -1 }).populate('sender receiver', 'name avatar verified badge').populate('post', 'title price condition author');

    const conversationsMap = new Map();

    messages.forEach(msg => {
      try {
        if (!msg || !msg.sender || !msg.receiver) return;
        const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
        const receiverId = msg.receiver._id ? msg.receiver._id.toString() : msg.receiver.toString();

        const isSenderMe = senderId === userId;
        const otherUser = isSenderMe ? msg.receiver : msg.sender;
        const otherUserId = isSenderMe ? receiverId : senderId;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, { otherUser, lastMessage: msg, timestamp: msg.timestamp, unreadCount: 0 });
        }

        if (!isSenderMe && !msg.isRead) conversationsMap.get(otherUserId).unreadCount += 1;
      } catch (e) { }
    });

    res.status(200).json(Array.from(conversationsMap.values()));
  } catch (error) { res.status(200).json([]); }
});

app.get('/api/messages/unread-count/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(200).json({ count: 0 });
    }
    const count = await Message.countDocuments({ receiver: req.params.userId, isRead: false });
    res.status(200).json({ count });
  } catch (err) { res.status(200).json({ count: 0 }); }
});

app.get('/api/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [{ sender: user1, receiver: user2 }, { sender: user2, receiver: user1 }]
    }).populate('post', 'title price image author').sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) { res.status(500).json({ message: 'Lỗi' }); }
});

app.post('/api/messages', upload.single('image'), async (req, res) => {
  try {
    const newMessage = new Message({
      sender: req.body.senderId,
      receiver: req.body.receiverId,
      content: req.body.text || '',
      post: req.body.postId || null
    });


    if (req.file) {
      newMessage.images = [req.file.path];
    }
    await newMessage.save();

    // Notify receiver
    await sendNotification(
      req.body.receiverId,
      '💬 Tin nhắn mới',
      req.body.text ? `"${req.body.text.substring(0, 30)}..."` : `Bạn nhận được 1 hình ảnh mới.`,
      'MESSAGE',
      '/chat'
    );


    const populatedMsg = await Message.findById(newMessage._id).populate('post', 'title price images image');
    res.status(200).json(populatedMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lưu tin nhắn" });
  }
});

app.put('/api/messages/mark-read', async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.body.otherId, receiver: req.body.userId, isRead: false },
      { $set: { isRead: true } }
    );
    // Đồng thời đánh dấu đã đọc cho thông báo loại MESSAGE
    await Notification.updateMany(
      { userId: req.body.userId, type: 'MESSAGE', isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'Đã đọc' });
  } catch (error) { res.status(500).json({ message: 'Lỗi' }); }
});

let onlineUsers = [];

io.on('connection', (socket) => {

  socket.on('addUser', (userId) => {
    if (userId) {
      socket.join('user_' + userId.toString());
      socket.userId = userId.toString();
    }
    onlineUsers = onlineUsers.filter(u => u.userId !== userId);
    onlineUsers.push({ userId, socketId: socket.id });
    io.emit('getUsers', onlineUsers);
  });

  if (socket.handshake.auth?.role === 'admin' || socket.handshake.query?.role === 'admin') {
    socket.join('admin_system_room');
  }

  socket.on('join_admin_room', (data) => {
    socket.join('admin_system_room');
    console.log(`🛡️ Socket ${socket.id} joined admin_system_room`);
  });

  socket.on('join', (room) => {
    if (room) socket.join(room);
  });


  socket.on('sendMessage', (msgData) => {
    const receiver = onlineUsers.find(u => u.userId === msgData.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('getMessage', msgData);
      io.to(receiver.socketId).emit('updateInbox');
    }
  });


  socket.on('disconnect', async () => {
    const disconnectedUser = onlineUsers.find(u => u.socketId === socket.id);
    if (disconnectedUser) {
      try {
        await User.findByIdAndUpdate(disconnectedUser.userId, { lastActive: Date.now() });
      } catch (e) { }
    }
    onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);


    io.emit('getUsers', onlineUsers);
  });
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh mục' });
  }
});



app.post('/api/haipay/deposit', async (req, res) => {
  try {
    const { amount, userId } = req.body;
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    let txnRef = `NAP_${userId}_${createDate}`;

    let vnp_Params = {
      'vnp_Version': '2.1.0', 'vnp_Command': 'pay', 'vnp_TmnCode': vnp_TmnCode,
      'vnp_Locale': 'vn', 'vnp_CurrCode': 'VND', 'vnp_TxnRef': txnRef,
      'vnp_OrderInfo': 'Nap tien vao vi HaiPay cho User ' + userId,
      'vnp_OrderType': 'topup', 'vnp_Amount': amount * 100,
      'vnp_ReturnUrl': vnp_ReturnUrl,
      'vnp_IpAddr': req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1',
      'vnp_CreateDate': createDate
    };

    vnp_Params = sortObject(vnp_Params);
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", vnp_HashSecret);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;

    let paymentUrl = vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
    res.status(200).json({ paymentUrl });
  } catch (error) { res.status(500).json({ error: 'Lỗi nạp tiền!' }); }
});

app.post('/api/haipay/verify', async (req, res) => {
  try {
    const { txnRef, responseCode, amount, vnp_Params, secureHash } = req.body;

    if (secureHash && vnp_Params) {
      const isValid = verifyVnpayChecksum(vnp_Params, secureHash);
      if (!isValid) {
        return res.status(400).json({ message: 'Chữ ký checksum không hợp lệ (Invalid Checksum)!' });
      }
    }

    if (responseCode === '00') {
      const parts = txnRef.split('_');
      const userId = parts[1];
      const actualAmount = parseInt(amount || req.body.amount) / 100;

      // Idempotency Check: Prevent duplicate credit via replay attack
      const existingTx = await Transaction.findOne({ txnRef });
      if (existingTx) {
        const currentUser = await User.findById(userId);
        return res.status(200).json({ message: 'Giao dịch đã được ghi nhận trước đó!', user: currentUser });
      }

      try {
        await Transaction.create({
          user: userId,
          type: 'Nạp tiền',
          amount: actualAmount,
          status: 'Thành công',
          txnRef,
          description: `Nạp tiền ví HaiPay qua VNPay (Mã GD: ${txnRef})`
        });
        const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: actualAmount } }, { new: true });
        return res.status(200).json({ message: 'Nạp tiền thành công!', user: updatedUser });
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          const currentUser = await User.findById(userId);
          return res.status(200).json({ message: 'Giao dịch đã được ghi nhận!', user: currentUser });
        }
        throw dupErr;
      }
    } else {
      res.status(400).json({ message: 'Giao dịch thất bại!' });
    }
  } catch (error) { res.status(500).json({ error: 'Lỗi xử lý ví!' }); }
});

app.post('/api/vnpay/create_payment_url', async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Thiếu mã đơn hàng (orderId)' });
    }
    const ipAddr = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    const paymentUrl = buildVnpayPaymentUrl({
      orderId,
      amount: Number(amount) || 0,
      ipAddr
    });
    res.status(200).json({ paymentUrl: paymentUrl });
  } catch (error) {
    console.error('VNPAY create_payment_url Error:', error);
    res.status(500).json({ error: 'Lỗi tạo link VNPay' });
  }
});

app.post('/api/vnpay/verify', async (req, res) => {
  try {
    const { orderId, responseCode, vnp_Params, secureHash } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Thiếu mã đơn hàng!' });

    if (secureHash && vnp_Params) {
      const isValid = verifyVnpayChecksum(vnp_Params, secureHash);
      if (!isValid) {
        return res.status(400).json({ message: 'Chữ ký checksum không hợp lệ (Invalid Checksum)!' });
      }
    }

    // 1. Check if orderId matches PaymentSession (Multi-Vendor Checkout parentOrderId)
    const session = await PaymentSession.findOne({ parentOrderId: orderId });
    if (session) {
      if (responseCode === '00') {
        const result = await settlePaymentSession(orderId, {
          gatewayPayload: { vnp_Params, responseCode },
          paymentMethod: 'VNPAY'
        });
        return res.status(200).json({
          message: 'Giao dịch VNPay thành công!',
          parentOrderId: orderId,
          ordersCount: result.orders?.length || 0
        });
      } else {
        session.status = 'failed';
        session.gatewayPayload = { vnp_Params, responseCode };
        await session.save();

        await Order.updateMany(
          { _id: { $in: session.orderIds } },
          { $set: { status: 'Cancelled', cancelReason: 'Thanh toán VNPay không thành công hoặc khách hủy' } }
        );
        return res.status(400).json({ message: 'Giao dịch thất bại hoặc đã bị khách hủy!' });
      }
    }

    // 2. Legacy fallback for single order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    if (responseCode === '00') {
      order.paymentStatus = 'escrow';
      order.status = 'Pending';
      order.paidAt = new Date();
      await order.save();

      const user = await User.findById(order.buyer);
      if (user && user.cart && user.cart.length > 0) {
        const purchasedIds = (order.items || []).map((id) => id.toString());
        user.cart = user.cart.filter((c) => c.product && !purchasedIds.includes(c.product.toString()));
        await user.save();
      }

      await Notification.create({
        user: order.seller,
        title: '🎉 Bạn có đơn hàng mới!',
        message: `Khách hàng vừa thanh toán đơn hàng #${order._id.toString().slice(-6).toUpperCase()}. Hãy chuẩn bị hàng nhé!`,
        link: '/seller-channel/orders'
      });

      return res.status(200).json({ message: 'Giao dịch VNPay thành công!' });
    } else {
      order.status = 'Cancelled';
      order.cancelReason = 'Thanh toán VNPay thất bại hoặc bị hủy';
      await order.save();
      return res.status(400).json({ message: 'Giao dịch thất bại hoặc đã bị khách hủy!' });
    }
  } catch (error) {
    console.error("Lỗi Verify VNPay:", error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác nhận thanh toán: ' + error.message });
  }
});

app.get('/api/vnpay/vnpay_ipn', async (req, res) => {
  try {
    let vnp_Params = { ...req.query };
    let secureHash = vnp_Params['vnp_SecureHash'];
    let orderId = vnp_Params['vnp_TxnRef'];
    let rspCode = vnp_Params['vnp_ResponseCode'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", vnp_HashSecret);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash && secureHash.toLowerCase() === signed.toLowerCase()) {
      if (rspCode === '00') {
        if (orderId && orderId.startsWith('NAP_')) {
          const parts = orderId.split('_');
          const userId = parts[1];
          const amount = parseInt(vnp_Params['vnp_Amount']) / 100;

          // Idempotency Check: Prevent duplicate credit via webhook retry/replay attack
          const existingTx = await Transaction.findOne({ txnRef: orderId });
          if (!existingTx) {
            try {
              await Transaction.create({
                user: userId,
                type: 'Nạp tiền',
                amount,
                status: 'Thành công',
                txnRef: orderId,
                description: `Nạp tiền ví HaiPay qua VNPay IPN (Mã GD: ${orderId})`
              });
              await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } });
            } catch (dupErr) {
              if (dupErr.code !== 11000) {
                console.error("Lỗi ghi nhận Transaction IPN:", dupErr);
              }
            }
          }
        } else if (orderId) {
          // Check if parentOrderId matches PaymentSession
          const session = await PaymentSession.findOne({ parentOrderId: orderId });
          if (session) {
            await settlePaymentSession(orderId, {
              gatewayPayload: vnp_Params,
              paymentMethod: 'VNPAY'
            });
          } else if (mongoose.isValidObjectId(orderId)) {
            const order = await Order.findById(orderId);
            if (order && order.paymentStatus !== 'escrow') {
              order.paymentStatus = 'escrow';
              order.status = 'Pending';
              order.paidAt = new Date();
              await order.save();
            }
          }
        }
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      } else {
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      }
    } else {
      res.status(200).json({ RspCode: '97', Message: 'Fail Checksum' });
    }
  } catch (error) {
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});


const bcrypt = require('bcryptjs');
const OtpToken = require('./models/OtpToken');
const { sendOtpEmail } = require('./utils/otpService');

app.post('/api/users/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Vui lòng cung cấp email!' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await mongoose.model('User').findOne({ email: cleanEmail });

    if (!user) return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản!' });

    // Generate cryptographically secure 6-digit numeric OTP
    const generatedOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(generatedOtp, 10);

    // Invalidate existing reset OTP tokens for this email
    await OtpToken.deleteMany({ identifier: cleanEmail, purpose: 'RESET_PASSWORD' });

    // Store hashed OTP in MongoDB with 5-minute TTL
    await OtpToken.create({
      identifier: cleanEmail,
      otpHash,
      purpose: 'RESET_PASSWORD',
      attempts: 0
    });

    // Dispatch OTP securely via server-side mailer (never returned in HTTP response)
    await sendOtpEmail({ email: cleanEmail, otp: generatedOtp, purpose: 'RESET_PASSWORD' });

    res.json({ success: true, message: 'Mã xác thực OTP đã được gửi đến email của bạn!' });
  } catch (err) {
    console.error('Lỗi khi gửi OTP đặt lại mật khẩu:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi gửi OTP!' });
  }
});

app.post('/api/users/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới!' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Find active token in MongoDB
    const tokenRecord = await OtpToken.findOne({ identifier: cleanEmail, purpose: 'RESET_PASSWORD' });
    if (!tokenRecord) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn hoặc không tồn tại!' });
    }

    if (tokenRecord.attempts >= 5) {
      await OtpToken.deleteOne({ _id: tokenRecord._id });
      return res.status(400).json({ message: 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới!' });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), tokenRecord.otpHash);
    if (!isMatch) {
      tokenRecord.attempts += 1;
      await tokenRecord.save();
      return res.status(400).json({ message: 'Mã OTP không chính xác!' });
    }

    const user = await mongoose.model('User').findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    // Securely hash new password before persistence
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Consume token immediately after successful reset
    await OtpToken.deleteOne({ _id: tokenRecord._id });

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('Lỗi khi đặt lại mật khẩu bằng OTP:', err);
    res.status(500).json({ message: 'Lỗi hệ thống khi đặt lại mật khẩu!' });
  }
});

// --- API CHATBOT AI (LM STUDIO & MONGODB) ---
const { processChatbot } = require('./services/chatbotService');

app.post('/api/chatbot/ask', async (req, res) => {
  try {
    const { message, history, image, userId, anonymousId } = req.body;
    if (!message && !image) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tin nhắn hoặc hình ảnh' });
    }

    if (image && (!image.startsWith('data:image/') || image.length > 7_000_000)) {
      return res.status(400).json({ error: 'Hình ảnh không hợp lệ hoặc vượt quá 5 MB' });
    }

    // Load UserInterestProfile to personalize ambiguous searches
    let profile = null;
    try {
      const UserInterestProfile = require('./models/UserInterestProfile');
      const orQueries = [];
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        orQueries.push({ userId: new mongoose.Types.ObjectId(userId) });
      }
      if (anonymousId && typeof anonymousId === 'string') {
        orQueries.push({ anonymousId: anonymousId.trim() });
      }
      if (orQueries.length > 0) {
        profile = await UserInterestProfile.findOne({ $or: orQueries }).lean();
      }
    } catch (e) {}

    const result = await processChatbot(message, history, image, profile);
    res.json(result);
  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    res.status(500).json({
      error: 'Không thể xử lý yêu cầu. Hãy kiểm tra Qwen3-VL, BGE-M3 và LM Studio ở cổng 1235.'
    });
  }
});

// Socket.io logic
let users = [];

const addUser = (userId, socketId) => {
  // Bỏ logic xóa/chặn nếu cùng userId, thay vào đó cứ push vào mảng để cho phép 1 user đăng nhập nhiều thiết bị (nhiều tab)
  users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId);
};

const getUserSockets = (userId) => {
  return users.filter(user => user.userId === userId);
};

io.on("connection", (socket) => {
  const handshakeUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  if (handshakeUserId) {
    socket.join('user_' + handshakeUserId.toString());
    addUser(handshakeUserId, socket.id);
  }

  socket.on("addUser", (userId) => {
    if (userId) {
      socket.join('user_' + userId.toString());
      socket.userId = userId.toString();
    }
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  if (socket.handshake.auth?.role === 'admin' || socket.handshake.query?.role === 'admin') {
    socket.join('admin_system_room');
  }

  socket.on("join_admin_room", (data) => {
    socket.join('admin_system_room');
    console.log(`🛡️ Socket ${socket.id} joined admin_system_room`);
  });

  socket.on("join", (room) => {
    if (room) socket.join(room);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text, post, images }) => {
    const receiverSockets = getUserSockets(receiverId);
    if (receiverSockets && receiverSockets.length > 0) {
      receiverSockets.forEach(userSocket => {
        io.to(userSocket.socketId).emit("getMessage", {
          senderId,
          text,
          post,
          images
        });
      });
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Hệ thống HaiHand đã sẵn sàng tại port ${PORT}`));
