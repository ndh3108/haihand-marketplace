const mongoose = require('mongoose');
const { AddressSnapshotSchema } = require('./schemas/Address');

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'escrow', 'released', 'refunded'];

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Multi-vendor: every sub-order created from one checkout shares this ref.
  // It is also used as vnp_TxnRef so one VNPAY payment settles all sub-orders.
  parentOrderId: { type: String, index: true },

  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  orderItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 },
    weight: { type: Number, default: 500 }, // grams per unit
    image: String
  }],

  itemsSubtotal: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true }, // itemsSubtotal + shippingFee

  phone: { type: String, required: true },
  address: { type: String, required: true }, // formatted snapshot (legacy readers)
  shippingAddress: { type: AddressSnapshotSchema, default: undefined },
  shippingService: {
    provider: { type: String, default: '' },
    serviceId: { type: Number },
    serviceTypeId: { type: Number },
    expectedDeliveryTime: { type: Date }
  },

  paymentMethod: { type: String, default: 'COD' },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
  paidAt: { type: Date },
  status: { type: String, default: 'Pending' },

  // Carrier shipment (created by seller via "Chuẩn bị hàng")
  shipment: {
    provider: { type: String, default: '' },
    trackingCode: { type: String, default: '' },
    fee: { type: Number, default: 0 },
    expectedDeliveryTime: { type: Date },
    createdAt: { type: Date },
    raw: { type: mongoose.Schema.Types.Mixed }
  },
  trackingCode: { type: String, default: '' },
  shippingCode: { type: String, default: '' },
  shippingCarrier: { type: String, default: 'HaiHand Express' },

  // Real-time GHN Shipping Tracking & Webhook Integration
  shippingStatus: {
    type: String,
    default: 'ready_to_pick' // e.g., 'ready_to_pick', 'picking', 'delivering', 'delivered', 'return', 'lost'
  },
  trackingLogs: [
    {
      status: { type: String, required: true },
      description: { type: String, default: '' },
      updated_at: { type: Date, default: Date.now }
    }
  ],

  deliveredAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String, default: '' },
  isReviewed: { type: Boolean, default: false }
}, { timestamps: true });

orderSchema.pre('save', function (next) {
  if (!this.buyer && this.buyerId) this.buyer = this.buyerId;
  if (!this.buyerId && this.buyer) this.buyerId = this.buyer;
  if (!this.seller && this.sellerId) this.seller = this.sellerId;
  if (!this.sellerId && this.seller) this.sellerId = this.seller;
  if (typeof next === 'function') next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
