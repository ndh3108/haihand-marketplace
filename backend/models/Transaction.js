const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['Nạp tiền', 'Rút tiền', 'Giải ngân', 'Hoàn tiền', 'Thanh toán đơn hàng'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Thành công', 'Đang xử lý', 'Thất bại'], default: 'Thành công' },
  txnRef: { type: String, unique: true, sparse: true, index: true },
  description: String,
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
