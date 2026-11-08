const mongoose = require('mongoose');

/**
 * One payment that settles one or more seller sub-orders.
 * parentOrderId === vnp_TxnRef for VNPAY payments.
 */
const paymentSessionSchema = new mongoose.Schema({
  parentOrderId: { type: String, required: true, unique: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  // productId -> qty purchased, used to deduct stock & clean the cart only after payment
  purchasedItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  itemsSubtotal: { type: Number, default: 0 },
  shippingTotal: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['VNPAY', 'HAIPAY', 'COD'], required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paidAt: { type: Date },
  gatewayPayload: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.models.PaymentSession || mongoose.model('PaymentSession', paymentSessionSchema);
