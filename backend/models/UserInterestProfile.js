const mongoose = require('mongoose');

const userInterestProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  anonymousId: {
    type: String,
    default: null,
    index: true
  },
  // Category score map: { "Điện tử": 15.4, "Thời trang": 4.2 }
  categories: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // Price preferences computed from interactions
  priceRange: {
    median: { type: Number, default: 0 },
    iqr: { type: Number, default: 0 },
    minPreferred: { type: Number, default: 0 },
    maxPreferred: { type: Number, default: 0 },
    sampleCount: { type: Number, default: 0 }
  },
  // Preferred condition breakdown: { "Mới": 10, "Đã qua sử dụng": 2 }
  preferredConditions: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // Preferred location breakdown: { "Hà Nội": 8, "TP. Hồ Chí Minh": 3 }
  preferredLocations: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // Seller affinity breakdown: { [sellerId]: score }
  sellerAffinity: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // User segment: 'new', 'browsing', 'high_intent', 'buyer'
  segment: {
    type: String,
    enum: ['new', 'browsing', 'high_intent', 'buyer'],
    default: 'new'
  },
  // Recent viewed product IDs (for quick exclusion / feature extraction)
  recentProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  // Purchased product IDs (for exclusion)
  purchasedProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  lastEventAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userInterestProfileSchema.index({ segment: 1, updatedAt: -1 });

const UserInterestProfile = mongoose.models.UserInterestProfile || mongoose.model('UserInterestProfile', userInterestProfileSchema, 'user_interest_profiles');

module.exports = UserInterestProfile;

