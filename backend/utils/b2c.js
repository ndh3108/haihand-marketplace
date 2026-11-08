const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const CATALOG_VISIBLE = ['active', 'APPROVED'];

const STATUS_TO_CANONICAL = {
  'Chờ xác nhận': 'Pending',
  'Chờ thanh toán VNPay': 'Pending',
  'Đã thanh toán (Admin giữ tiền)': 'Pending',
  'Người bán đã chuẩn bị hàng': 'Processing',
  'Đang giao hàng': 'Shipped',
  'Đang giao': 'Shipped',
  'Hoàn thành': 'Completed',
  'Đã thanh toán cho người bán': 'Completed',
  'Đã hủy': 'Cancelled',
  'Đã hủy (Chờ hoàn tiền)': 'Cancelled',
  Pending: 'Pending',
  Processing: 'Processing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Completed: 'Completed',
  Cancelled: 'Cancelled'
};

function canonicalStatus(status) {
  return STATUS_TO_CANONICAL[status] || status || 'Pending';
}

function productOwnerId(product) {
  if (!product) return '';
  const id = product.sellerId || product.author;
  if (!id) return '';
  const raw = id._id ? id._id : id;
  return raw ? raw.toString() : '';
}

function orderBuyerId(order) {
  if (!order) return null;
  const b = order.buyerId || order.buyer;
  if (!b) return null;
  return b._id ? b._id : b;
}

function orderSellerId(order) {
  if (!order) return null;
  const s = order.sellerId || order.seller;
  if (!s) return null;
  return s._id ? s._id : s;
}

function isEscrow(order) {
  return order.paymentStatus === 'escrow' || order.status === 'Đã thanh toán (Admin giữ tiền)';
}

function sanitizeUser(user) {
  if (!user) return null;
  const o = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete o.password;
  return o;
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      isSeller: !!user.isSeller,
      sellerStatus: user.sellerStatus || 'none'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function displayProductName(product) {
  if (!product) return 'Sản phẩm';
  return product.name || product.title || 'Sản phẩm';
}

module.exports = {
  JWT_SECRET,
  CATALOG_VISIBLE,
  canonicalStatus,
  productOwnerId,
  orderBuyerId,
  orderSellerId,
  isEscrow,
  sanitizeUser,
  signUserToken,
  displayProductName
};
