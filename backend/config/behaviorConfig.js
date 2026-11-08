/**
 * Configuration for User Behavioral Analytics & Recommendation Engine
 * HaiHand Marketplace
 */

module.exports = {
  // Weights for different user interactions
  EVENT_WEIGHTS: {
    product_view: 1.0,
    product_dwell: 2.0, // for dwell duration >= 30 seconds
    search: 0.5,
    search_click: 1.5,
    category_view: 0.8,
    favorite_add: 4.0,
    favorite_remove: -2.0,
    cart_add: 5.0,
    purchase: 8.0,
    recommendation_impression: 0.1,
    recommendation_click: 1.2,
    chat_product_click: 2.0
  },

  // Half-life for temporal score decay (14 days in milliseconds)
  HALF_LIFE_MS: 14 * 24 * 60 * 60 * 1000,

  // Allowed event types (strict whitelist)
  ALLOWED_EVENT_TYPES: [
    'product_view',
    'product_dwell',
    'search',
    'category_view',
    'favorite_add',
    'favorite_remove',
    'cart_add',
    'purchase',
    'recommendation_impression',
    'recommendation_click',
    'chat_product_click'
  ],

  // Allowed sources (whitelist)
  ALLOWED_SOURCES: [
    'home',
    'detail',
    'cart',
    'chatbot',
    'search',
    'favorites',
    'recommendation',
    'seller',
    'other'
  ],

  // Sensitive fields to strip for privacy
  SENSITIVE_FIELDS: [
    'email',
    'phone',
    'password',
    'token',
    'address',
    'fullName',
    'cardNumber',
    'secret'
  ],

  // Rate limiting constants
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 120      // max 120 tracking batch requests per minute per IP/anonymousId
  },

  // Event batch configuration
  MAX_BATCH_SIZE: 20,

  // Event TTL in days for MongoDB TTL index
  EVENT_TTL_DAYS: 90,

  // Recommendation engine constants
  RECOMMENDATION: {
    CACHE_TTL_MS: 45 * 1000, // 45 seconds cache
    MAX_PER_SELLER: 2,       // Diversity constraint
    MIN_DWELL_SECONDS: 5,
    SIGNIFICANT_DWELL_SECONDS: 30,
    MAX_DWELL_SECONDS: 300,
    VIEW_DEDUPE_MS: 30 * 60 * 1000 // 30 minutes
  }
};

