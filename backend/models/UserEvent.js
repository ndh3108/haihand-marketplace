const mongoose = require('mongoose');
const { ALLOWED_EVENT_TYPES, EVENT_TTL_DAYS } = require('../config/behaviorConfig');

const userEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  anonymousId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  sessionId: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ALLOWED_EVENT_TYPES,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    default: null
  },
  query: {
    type: String,
    trim: true,
    default: ''
  },
  source: {
    type: String,
    trim: true,
    default: 'other'
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We use our own indexed createdAt with TTL
});

// Primary compound indexes for fast behavioral lookups
userEventSchema.index({ userId: 1, createdAt: -1 });
userEventSchema.index({ anonymousId: 1, createdAt: -1 });
userEventSchema.index({ productId: 1, type: 1, createdAt: -1 });
userEventSchema.index({ type: 1, createdAt: -1 });

// TTL Index: Automatically expire events after 90 days
userEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: EVENT_TTL_DAYS * 24 * 60 * 60 });

const UserEvent = mongoose.models.UserEvent || mongoose.model('UserEvent', userEventSchema, 'user_events');

module.exports = UserEvent;

