require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const { Post } = require('../models/Product');
const { canonicalStatus } = require('../utils/b2c');

async function migrate() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const posters = await Post.distinct('author');
  const sellerIds = await Post.distinct('sellerId');
  const allSellerIds = [...new Set([...posters, ...sellerIds].filter(Boolean).map((id) => id.toString()))];

  let approved = 0;
  for (const id of allSellerIds) {
    const user = await User.findById(id);
    if (!user) continue;
    if (user.sellerStatus === 'approved' && user.isSeller) continue;
    user.isSeller = true;
    user.sellerStatus = 'approved';
    user.sellerApprovedAt = user.sellerApprovedAt || new Date();
    user.shopInfo = {
      shopName: (user.shopInfo && user.shopInfo.shopName) || user.name,
      description: (user.shopInfo && user.shopInfo.description) || user.bio || '',
      address: (user.shopInfo && user.shopInfo.address) || user.address || '',
      avatar: (user.shopInfo && user.shopInfo.avatar) || user.avatar || '',
      banner: (user.shopInfo && user.shopInfo.banner) || '',
      phone: (user.shopInfo && user.shopInfo.phone) || user.phone || '',
      taxCode: (user.shopInfo && user.shopInfo.taxCode) || user.taxId || ''
    };
    await user.save();
    approved += 1;
  }

  await User.updateMany(
    { sellerStatus: { $exists: false } },
    { $set: { isSeller: false, sellerStatus: 'none' } }
  );

  const posts = await Post.find({});
  let postUpdated = 0;
  for (const post of posts) {
    let changed = false;
    if (!post.sellerId && post.author) {
      post.sellerId = post.author;
      changed = true;
    }
    if (!post.author && post.sellerId) {
      post.author = post.sellerId;
      changed = true;
    }
    if (!post.name && post.title) {
      post.name = post.title;
      changed = true;
    }
    if (!post.title && post.name) {
      post.title = post.name;
      changed = true;
    }
    if (post.stockQuantity == null && post.quantity != null) {
      post.stockQuantity = post.quantity;
      changed = true;
    }
    if (post.quantity == null && post.stockQuantity != null) {
      post.quantity = post.stockQuantity;
      changed = true;
    }
    if (post.status === 'APPROVED') {
      post.status = 'active';
      changed = true;
    } else if (post.status === 'PENDING' || post.status === 'Pending') {
      post.status = 'inactive';
      changed = true;
    } else if (post.status === 'SOLD' || Number(post.stockQuantity) === 0) {
      post.status = 'out_of_stock';
      changed = true;
    }
    if (changed) {
      await post.save();
      postUpdated += 1;
    }
  }

  const orders = await Order.find({});
  let orderUpdated = 0;
  for (const order of orders) {
    let changed = false;
    if (!order.buyerId && order.buyer) {
      order.buyerId = order.buyer;
      changed = true;
    }
    if (!order.buyer && order.buyerId) {
      order.buyer = order.buyerId;
      changed = true;
    }
    if (!order.sellerId && order.seller) {
      order.sellerId = order.seller;
      changed = true;
    }
    if (!order.seller && order.sellerId) {
      order.seller = order.sellerId;
      changed = true;
    }
    if (order.status === 'Đã thanh toán (Admin giữ tiền)') {
      order.paymentStatus = 'escrow';
      changed = true;
    } else if (order.status === 'Đã thanh toán cho người bán') {
      order.paymentStatus = 'released';
      changed = true;
    } else if (order.status === 'Đã hủy (Chờ hoàn tiền)' || order.status === 'Đã hủy') {
      if (order.status === 'Đã hủy (Chờ hoàn tiền)') order.paymentStatus = 'refunded';
      changed = true;
    }
    const nextStatus = canonicalStatus(order.status);
    if (nextStatus !== order.status) {
      order.status = nextStatus;
      changed = true;
    }
    if ((!order.orderItems || order.orderItems.length === 0) && order.items && order.items.length) {
      const products = await Post.find({ _id: { $in: order.items } });
      order.orderItems = products.map((p) => ({
        productId: p._id,
        name: p.name || p.title,
        price: p.price,
        quantity: 1,
        image: (p.images && p.images[0]) || ''
      }));
      changed = true;
    }
    if (changed) {
      await order.save();
      orderUpdated += 1;
    }
  }

  console.log(JSON.stringify({ approvedSellers: approved, postUpdated, orderUpdated }, null, 2));
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
