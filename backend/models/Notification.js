const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Target recipient user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  // Backward compatibility alias for userId
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Target seller shop ID (if applicable)
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  // Target role context
  targetRole: {
    type: String,
    enum: ['buyer', 'seller', 'admin', 'all'],
    default: 'buyer',
    index: true
  },
  // Recipient role context (backward compatible alias for targetRole)
  recipientRole: {
    type: String,
    enum: ['buyer', 'seller', 'admin', 'all'],
    default: 'buyer',
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'ORDER',          // General order update
      'NEW_ORDER',      // Incoming new order for seller
      'ORDER_STATUS',   // Order status transition for buyer
      'MESSAGE',        // New chat message
      'SYSTEM',         // Platform announcements / warnings
      'PAYMENT',        // HaiPay / VNPay wallet notifications
      'PRODUCT',        // Product approval / stock warnings
      'SELLER',         // Seller application approval / rejection
      'RETURN_REFUND',  // Return / refund requests
      'REVIEW',         // Product reviews
      'WITHDRAWAL',     // User withdrawal request for admin
      'REPORT'          // User report on listing for admin
    ],
    default: 'SYSTEM',
    index: true
  },
  link: {
    type: String,
    default: '/'
  },
  targetUrl: {
    type: String,
    default: '/'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true, strict: false });

// Ensure bidirectional synchronization between user, userId, shopId, link, targetUrl, recipientRole, and targetRole
notificationSchema.pre('save', function (next) {
  if (this.user && !this.userId) {
    this.userId = this.user;
  }
  if (this.userId && !this.user) {
    this.user = this.userId;
  }
  if ((this.recipientRole === 'seller' || this.targetRole === 'seller') && this.userId && !this.shopId) {
    this.shopId = this.userId;
  }
  // Synchronize targetRole and recipientRole
  if (this.targetRole && !this.recipientRole) {
    this.recipientRole = this.targetRole;
  } else if (this.recipientRole && !this.targetRole) {
    this.targetRole = this.recipientRole;
  } else if (this.targetRole === 'admin' || this.recipientRole === 'admin') {
    this.targetRole = 'admin';
    this.recipientRole = 'admin';
  }
  if (this.link && (!this.targetUrl || this.targetUrl === '/')) {
    this.targetUrl = this.link;
  }
  if (this.targetUrl && (!this.link || this.link === '/')) {
    this.link = this.targetUrl;
  }
  if (typeof next === 'function') next();
});

// Compound indexes for high-throughput queries
notificationSchema.index({ userId: 1, recipientRole: 1, isRead: 1 });
notificationSchema.index({ targetRole: 1, isRead: 1 });
notificationSchema.index({ shopId: 1, recipientRole: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1, isRead: 1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
