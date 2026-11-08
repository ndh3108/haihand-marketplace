const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  sku: { type: String, default: '' },
  stockQuantity: { type: Number, default: 1 },
  quantity: { type: Number, default: 1 },
  soldCount: { type: Number, default: 0 },
  category: { type: String, required: true }, 
  location: { type: String, default: "Toàn quốc" }, 
  image: String,
  images: [{ type: String }],
  description: String,
  condition: { type: String, default: "Mới" },
  variants: [{ name: String, options: [String] }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'PENDING', 'APPROVED', 'SOLD', 'DELETED', 'Pending', 'Chờ duyệt'],
    default: 'active'
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  if (!this.author && this.sellerId) this.author = this.sellerId;
  if (!this.sellerId && this.author) this.sellerId = this.author;
  next();
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema, "posts");
module.exports = Product;
