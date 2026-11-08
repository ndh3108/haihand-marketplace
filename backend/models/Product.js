const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String },
  title: { type: String },
  sku: { type: String, default: '' },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  stockQuantity: { type: Number, default: 1, min: 0 },
  quantity: { type: Number, default: 1 },
  soldCount: { type: Number, default: 0 },
  weight: { type: Number, default: 500, min: 1 }, // grams per unit, for shipping fee
  category: { type: String, required: true },
  location: { type: String, default: 'Toàn quốc' },
  description: { type: String, default: '' },
  images: [{ type: String }],
  condition: { type: String, default: 'Mới' },
  variants: [{
    name: String,
    options: [String]
  }],
  details: { type: Map, of: String },
  ragText: { type: String, default: '' },
  textEmbedding: { type: [Number], default: undefined, select: false },
  embeddingModel: { type: String, default: '', select: false },
  imageEmbedding: { type: [Number], default: undefined, select: false },
  imageEmbeddingModel: { type: String, default: '', select: false },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'PENDING', 'APPROVED', 'SOLD', 'DELETED', 'Pending'],
    default: 'active'
  }
}, { timestamps: true });

const LEGACY_STATUS = {
  PENDING: 'inactive',
  Pending: 'inactive',
  APPROVED: 'active',
  SOLD: 'out_of_stock',
  DELETED: 'inactive'
};

productSchema.pre('validate', function (next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  if (!this.author && this.sellerId) this.author = this.sellerId;
  if (!this.sellerId && this.author) this.sellerId = this.author;
  if (this.stockQuantity !== undefined && (this.quantity === undefined || this.quantity === null)) {
    this.quantity = this.stockQuantity;
  }
  if (this.quantity !== undefined && (this.stockQuantity === undefined || this.stockQuantity === null)) {
    this.stockQuantity = this.quantity;
  }
  if (LEGACY_STATUS[this.status]) this.status = LEGACY_STATUS[this.status];
  if (Number(this.stockQuantity) === 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  }
  if (typeof next === 'function') next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema, 'posts');
const Post = mongoose.models.Post || mongoose.model('Post', productSchema, 'posts');

module.exports = { Product, Post, productSchema };
