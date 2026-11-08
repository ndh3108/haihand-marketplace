const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../utils/b2c');

async function protect(req, res, next) {
  let userId = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.split(' ')[1];
    if (rawToken && rawToken !== 'undefined' && rawToken !== 'null') {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        userId = decoded.id || decoded._id;
        req.tokenPayload = decoded;
      } catch (e) {
        // Nếu có fallback header userid thì cho phép kiểm tra tiếp, nếu không thì trả về 401
        if (!req.headers.userid) {
          return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
      }
    }
  }

  if (!userId) {
    userId = req.headers.userid || req.headers.userid || req.body?.userId || req.query?.userId;
  }

  if (!userId) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    return res.status(401).json({ message: 'Không tìm thấy người dùng' });
  }

  req.user = user;
  next();
}

function isSeller(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }
  if (req.user.isSeller === true && req.user.sellerStatus === 'approved') {
    return next();
  }
  return res.status(403).json({ message: 'Bạn cần được Admin duyệt Seller Registration để vào Kênh Người Bán.' });
}

function isAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded.role === 'Admin') {
        req.adminId = decoded.id;
        return next();
      }
    } catch (e) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  }

  if (req.user && req.user.role === 'Admin') {
    req.adminId = req.user._id;
    return next();
  }

  if (req.session && req.session.adminId) {
    req.adminId = req.session.adminId;
    return next();
  }

  return res.status(403).json({ message: 'Bạn không có quyền quản trị' });
}

module.exports = { protect, isSeller, isAdmin };
