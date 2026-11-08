const mongoose = require('mongoose');

const productCoViewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  coViewedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Ensure uniqueness per directed pair
productCoViewSchema.index({ productId: 1, coViewedProductId: 1 }, { unique: true });
productCoViewSchema.index({ productId: 1, count: -1 });

const ProductCoView = mongoose.models.ProductCoView || mongoose.model('ProductCoView', productCoViewSchema, 'product_co_views');

module.exports = ProductCoView;

