const mongoose = require('mongoose');
require('../models/User'); // Ensure User model is always registered for populate
const { Product, Post } = require('../models/Product');
const UserEvent = require('../models/UserEvent');
const UserInterestProfile = require('../models/UserInterestProfile');
const ProductCoView = require('../models/ProductCoView');
const { CATALOG_VISIBLE } = require('../utils/b2c');
const { RECOMMENDATION } = require('../config/behaviorConfig');

// Query clause to match available products (handles both new stockQuantity and legacy quantity)
const IN_STOCK_CLAUSE = {
  $or: [
    { stockQuantity: { $gt: 0 } },
    { quantity: { $gt: 0 } },
    { stockQuantity: { $exists: false }, quantity: { $exists: false } }
  ]
};

// In-memory short-term recommendation cache (key: 'userKey:type', value: { data, expiry })
const recoCache = new Map();

function getCachedReco(key) {
  const item = recoCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}

function setCachedReco(key, data, ttlMs = RECOMMENDATION.CACHE_TTL_MS) {
  recoCache.set(key, { data, expiry: Date.now() + ttlMs });
  // Evict old entries if cache grows large
  if (recoCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of recoCache.entries()) {
      if (v.expiry <= now) recoCache.delete(k);
    }
  }
}

/**
 * Cosine similarity between two float arrays
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Filter and enforce catalog visibility, stock and seller diversity
 */
function applyCatalogFilters(products, { excludeIds = [], currentUserId = null, maxPerSeller = 2 }) {
  const sellerCounts = new Map();
  const cleanExclude = new Set(excludeIds.map((id) => id.toString()));
  const filtered = [];

  for (const p of products) {
    if (!p) continue;
    const pIdStr = p._id.toString();
    if (cleanExclude.has(pIdStr)) continue;

    // Must be in catalog visible statuses and have stock
    const isVisible = CATALOG_VISIBLE.includes(p.status);
    const inStock = (p.stockQuantity != null ? p.stockQuantity : (p.quantity != null ? p.quantity : 1)) > 0;
    if (!isVisible || !inStock) continue;

    // Check seller ownership
    const ownerId = (p.sellerId || p.author || (p.author && p.author._id) || (p.sellerId && p.sellerId._id) || '').toString();
    if (currentUserId && ownerId && ownerId === currentUserId.toString()) {
      continue;
    }

    // Enforce diversity: maximum N products per seller
    const count = sellerCounts.get(ownerId) || 0;
    if (count >= maxPerSeller) {
      continue;
    }
    sellerCounts.set(ownerId, count + 1);

    filtered.push(p);
  }

  return filtered;
}

/**
 * 1. GET /api/recommendations/recently-viewed
 * Returns recently viewed items for authenticated user or anonymous visitor
 */
async function getRecentlyViewed({ userId = null, anonymousId = null, limit = 12 }) {
  try {
    if (mongoose.connection.readyState === 0) return [];

    const userKey = userId ? `u:${userId}` : (anonymousId ? `a:${anonymousId}` : null);
    if (!userKey) return [];

    const cached = getCachedReco(`recent:${userKey}`);
    if (cached) return cached;

    const query = {
      type: 'product_view',
      productId: { $ne: null }
    };
    if (userId) {
      query.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        ...(anonymousId ? [{ anonymousId }] : [])
      ];
    } else {
      query.anonymousId = anonymousId;
    }

    // Retrieve recent view events
    const recentEvents = await UserEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(60)
      .select('productId createdAt')
      .lean();

    if (!recentEvents || recentEvents.length === 0) {
      return [];
    }

    // Maintain unique product IDs in order of most recently viewed
    const orderedIds = [];
    const seen = new Set();
    for (const ev of recentEvents) {
      if (!ev.productId) continue;
      const pidStr = ev.productId.toString();
      if (!seen.has(pidStr)) {
        seen.add(pidStr);
        orderedIds.push(new mongoose.Types.ObjectId(pidStr));
      }
    }

    if (orderedIds.length === 0) return [];

    // Fetch products
    const dbProducts = await Post.find({
      _id: { $in: orderedIds },
      status: { $in: CATALOG_VISIBLE },
      ...IN_STOCK_CLAUSE
    })
      .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
      .lean();

    // Map back to original order
    const prodMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));
    const result = [];
    for (const id of orderedIds) {
      const p = prodMap.get(id.toString());
      if (p) {
        // Exclude own products if logged in
        const owner = (p.sellerId || p.author || (p.author?._id) || '').toString();
        if (userId && owner === userId.toString()) continue;

        result.push({
          ...p,
          recoSource: 'recently_viewed',
          recoReason: 'Sản phẩm bạn vừa xem'
        });
        if (result.length >= limit) break;
      }
    }

    setCachedReco(`recent:${userKey}`, result, 15 * 1000);
    return result;
  } catch (error) {
    console.warn('[RecoService] getRecentlyViewed error:', error.message);
    return [];
  }
}

/**
 * Cold-start fallback recommendation (Trending 7-day + newest)
 */
async function getColdStartRecommendations({ currentUserId = null, limit = 15 }) {
  try {
    if (mongoose.connection.readyState === 0) return [];
    // 1. Fetch top viewed in past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topViews = await UserEvent.aggregate([
      {
        $match: {
          type: 'product_view',
          createdAt: { $gte: sevenDaysAgo },
          productId: { $ne: null }
        }
      },
      { $group: { _id: '$productId', viewCount: { $sum: 1 } } },
      { $sort: { viewCount: -1 } },
      { $limit: limit * 2 }
    ]);

    const trendingIds = topViews.map((v) => v._id);

    let candidates = [];
    if (trendingIds.length > 0) {
      candidates = await Post.find({
        _id: { $in: trendingIds },
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();
    }

    // If still need more, fill with top soldCount and newest posts
    if (candidates.length < limit) {
      const more = await Post.find({
        _id: { $nin: candidates.map((c) => c._id) },
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(limit * 2)
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();
      candidates = [...candidates, ...more];
    }

    const filtered = applyCatalogFilters(candidates, {
      currentUserId,
      maxPerSeller: RECOMMENDATION.MAX_PER_SELLER
    }).slice(0, limit);

    return filtered.map((p) => ({
      ...p,
      recoSource: 'for_you',
      recoReason: 'Sản phẩm đang thịnh hành trên sàn'
    }));
  } catch (err) {
    console.warn('[RecoService] getColdStartRecommendations error:', err.message);
    return [];
  }
}

/**
 * 2. GET /api/recommendations/for-you
 * Hybrid Recommendation Engine
 * Score = 0.40 * contentSim + 0.25 * categoryAffinity + 0.15 * priceFit + 0.10 * coView + 0.10 * popularity
 */
async function getForYou({ userId = null, anonymousId = null, limit = 15 }) {
  try {
    if (mongoose.connection.readyState === 0) return [];

    const userKey = userId ? `u:${userId}` : (anonymousId ? `a:${anonymousId}` : null);
    if (!userKey) {
      return getColdStartRecommendations({ currentUserId: userId, limit });
    }

    const cached = getCachedReco(`foryou:${userKey}`);
    if (cached) return cached;

    // Load UserInterestProfile
    const profileQuery = userId
      ? { $or: [{ userId: new mongoose.Types.ObjectId(userId) }, ...(anonymousId ? [{ anonymousId }] : [])] }
      : { anonymousId };

    const profile = await UserInterestProfile.findOne(profileQuery).lean();

    if (!profile || (!profile.categories && !profile.recentProductIds?.length)) {
      // Cold-start fallback
      return getColdStartRecommendations({ currentUserId: userId, limit });
    }

    // Exclude purchased and already viewed products
    const excludedIds = [
      ...(profile.purchasedProductIds || []),
      ...(profile.recentProductIds || []).slice(-5) // exclude 5 most recent views
    ];

    // Extract preferred categories & top score
    const catMap = profile.categories instanceof Map
      ? profile.categories
      : new Map(Object.entries(profile.categories || {}));

    const topCategories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat)
      .slice(0, 4);

    let maxCatScore = 1;
    for (const score of catMap.values()) {
      if (score > maxCatScore) maxCatScore = score;
    }

    // Price preference stats
    const { median = 0, minPreferred = 0, maxPreferred = 0 } = profile.priceRange || {};

    // Get candidate products: top categories + general visible
    const candidateQuery = {
      _id: { $nin: excludedIds },
      status: { $in: CATALOG_VISIBLE },
      $and: [
        IN_STOCK_CLAUSE
      ]
    };

    if (topCategories.length > 0) {
      candidateQuery.$and.push({
        $or: [
          { category: { $in: topCategories } },
          { soldCount: { $gte: 1 } }
        ]
      });
    }

    // Find candidate products with embeddings for content similarity
    const candidateProducts = await Post.find(candidateQuery)
      .select('+textEmbedding')
      .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
      .limit(60)
      .lean();

    if (!candidateProducts || candidateProducts.length === 0) {
      return getColdStartRecommendations({ currentUserId: userId, limit });
    }

    // Extract target embedding from the user's most recent interaction
    let targetEmbedding = null;
    if (profile.recentProductIds && profile.recentProductIds.length > 0) {
      const lastViewed = await Post.findById(profile.recentProductIds[profile.recentProductIds.length - 1])
        .select('+textEmbedding')
        .lean();
      if (lastViewed && Array.isArray(lastViewed.textEmbedding) && lastViewed.textEmbedding.length > 0) {
        targetEmbedding = lastViewed.textEmbedding;
      }
    }

    // Co-view score map for recent products
    const coViewScores = new Map();
    if (profile.recentProductIds && profile.recentProductIds.length > 0) {
      const recentSlice = profile.recentProductIds.slice(-3);
      const coViewRows = await ProductCoView.find({
        productId: { $in: recentSlice }
      }).lean();

      for (const row of coViewRows) {
        const idStr = row.coViewedProductId.toString();
        const cur = coViewScores.get(idStr) || 0;
        coViewScores.set(idStr, cur + (row.count || 1));
      }
    }

    const now = Date.now();
    const scoredList = [];

    for (const prod of candidateProducts) {
      // 1. Content similarity (cosine textEmbedding)
      let contentSim = 0;
      if (targetEmbedding && Array.isArray(prod.textEmbedding)) {
        contentSim = Math.max(0, cosineSimilarity(targetEmbedding, prod.textEmbedding));
      }

      // 2. Category Affinity (normalized 0-1)
      const rawCatScore = catMap.get(prod.category) || 0;
      const categoryAffinity = Math.min(1.0, rawCatScore / maxCatScore);

      // 3. Price Fit (Gaussian-style distance from median)
      let priceFit = 0.5;
      if (median > 0 && typeof prod.price === 'number') {
        if (minPreferred > 0 && maxPreferred > 0 && prod.price >= minPreferred && prod.price <= maxPreferred) {
          priceFit = 1.0;
        } else {
          const diffRatio = Math.abs(prod.price - median) / (median || 1);
          priceFit = Math.max(0.1, 1 - Math.min(1, diffRatio));
        }
      }

      // 4. Co-View Score (normalized)
      const coViewCount = coViewScores.get(prod._id.toString()) || 0;
      const coViewScore = Math.min(1.0, coViewCount / 10);

      // 5. Popularity (soldCount and age)
      const popularity = Math.min(1.0, (prod.soldCount || 0) / 20);

      // Total Hybrid Score
      let finalScore =
        0.40 * contentSim +
        0.25 * categoryAffinity +
        0.15 * priceFit +
        0.10 * coViewScore +
        0.10 * popularity;

      // Age penalty: decrease score for older posts (> 30 days)
      const postAgeDays = Math.max(0, (now - new Date(prod.createdAt).getTime()) / (24 * 3600 * 1000));
      if (postAgeDays > 30) {
        finalScore *= Math.max(0.7, 1 - (postAgeDays - 30) / 100);
      }

      // Remove textEmbedding before passing to client for security & payload size
      delete prod.textEmbedding;

      // Friendly Vietnamese recommendation reason
      let recoReason = 'Gợi ý phù hợp với sở thích của bạn';
      if (categoryAffinity > 0.5) {
        recoReason = `Dành riêng cho bạn từ danh mục ${prod.category}`;
      } else if (contentSim > 0.6) {
        recoReason = 'Tương tự với các sản phẩm bạn đã xem gần đây';
      }

      scoredList.push({
        product: prod,
        score: finalScore,
        recoReason
      });
    }

    // Sort descending by score
    scoredList.sort((a, b) => b.score - a.score);

    // Apply catalog filters & diversity
    const cleanProducts = applyCatalogFilters(
      scoredList.map((item) => ({
        ...item.product,
        recoSource: 'for_you',
        recoReason: item.recoReason
      })),
      {
        currentUserId: userId,
        excludeIds,
        maxPerSeller: RECOMMENDATION.MAX_PER_SELLER
      }
    ).slice(0, limit);

    // If result is empty or too small, top up with cold start
    let finalResult = cleanProducts;
    if (finalResult.length < limit) {
      const existingIds = new Set(finalResult.map((p) => p._id.toString()));
      const coldStartItems = await getColdStartRecommendations({ currentUserId: userId, limit: limit - finalResult.length });
      for (const item of coldStartItems) {
        if (!existingIds.has(item._id.toString())) {
          finalResult.push(item);
          existingIds.add(item._id.toString());
        }
      }
    }

    setCachedReco(`foryou:${userKey}`, finalResult);
    return finalResult;
  } catch (error) {
    console.error('[RecoService] getForYou error:', error);
    return getColdStartRecommendations({ currentUserId: userId, limit });
  }
}

/**
 * 3. GET /api/recommendations/similar/:productId
 * Similar products based on vector embedding or category & price bounds fallback
 */
async function getSimilarProducts({ productId, userId = null, limit = 8 }) {
  try {
    if (mongoose.connection.readyState === 0) return [];
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return [];
    }

    const cached = getCachedReco(`similar:${productId}`);
    if (cached) return cached;

    const baseProduct = await Post.findById(productId).select('+textEmbedding').lean();
    if (!baseProduct) return [];

    let candidates = [];
    const baseVector = baseProduct.textEmbedding;

    // Try vector search if embedding exists
    if (Array.isArray(baseVector) && baseVector.length > 0) {
      try {
        const VECTOR_INDEX = process.env.VECTOR_INDEX_NAME || 'product_vector_index';
        const vectorResults = await Post.aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX,
              path: 'textEmbedding',
              queryVector: baseVector,
              numCandidates: 40,
              limit: 20
            }
          },
          {
            $match: {
              _id: { $ne: new mongoose.Types.ObjectId(productId) },
              status: { $in: CATALOG_VISIBLE },
              ...IN_STOCK_CLAUSE
            }
          },
          {
            $project: {
              name: 1, title: 1, price: 1, category: 1, location: 1,
              images: 1, description: 1, condition: 1, status: 1,
              stockQuantity: 1, soldCount: 1, author: 1, sellerId: 1, createdAt: 1
            }
          }
        ]);
        candidates = vectorResults;
      } catch (vectorErr) {
        // Fallback gracefully if Atlas vector search index is not available
      }
    }

    // Fallback: match by same category + price range ±30%
    if (!candidates || candidates.length < limit) {
      const minPrice = Math.round(baseProduct.price * 0.7);
      const maxPrice = Math.round(baseProduct.price * 1.3);

      const fallbackProds = await Post.find({
        _id: {
          $ne: new mongoose.Types.ObjectId(productId),
          $nin: candidates.map((c) => c._id)
        },
        category: baseProduct.category,
        price: { $gte: minPrice, $lte: maxPrice },
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .limit(limit * 2)
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();

      candidates = [...candidates, ...fallbackProds];
    }

    // If still less than limit, broaden to same category without price constraint
    if (candidates.length < limit) {
      const categoryProds = await Post.find({
        _id: {
          $ne: new mongoose.Types.ObjectId(productId),
          $nin: candidates.map((c) => c._id)
        },
        category: baseProduct.category,
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .limit(limit * 2)
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();

      candidates = [...candidates, ...categoryProds];
    }

    const filtered = applyCatalogFilters(candidates, {
      currentUserId: userId,
      excludeIds: [productId],
      maxPerSeller: RECOMMENDATION.MAX_PER_SELLER
    }).slice(0, limit);

    const result = filtered.map((p) => ({
      ...p,
      recoSource: 'similar',
      recoReason: `Tương tự "${baseProduct.title || baseProduct.name || 'sản phẩm này'}"`
    }));

    setCachedReco(`similar:${productId}`, result);
    return result;
  } catch (error) {
    console.warn('[RecoService] getSimilarProducts error:', error.message);
    return [];
  }
}

/**
 * 4. GET /api/recommendations/also-viewed/:productId
 * Products frequently co-viewed with this product
 */
async function getAlsoViewed({ productId, userId = null, limit = 8 }) {
  try {
    if (mongoose.connection.readyState === 0) return [];
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return [];
    }

    const cached = getCachedReco(`alsoviewed:${productId}`);
    if (cached) return cached;

    const baseProduct = await Post.findById(productId).select('title name category price').lean();
    if (!baseProduct) return [];

    // Query co-view matrix
    const coViewRows = await ProductCoView.find({
      productId: new mongoose.Types.ObjectId(productId)
    })
      .sort({ count: -1 })
      .limit(limit * 2)
      .lean();

    let candidateIds = coViewRows.map((r) => r.coViewedProductId);
    let candidates = [];

    if (candidateIds.length > 0) {
      candidates = await Post.find({
        _id: { $in: candidateIds },
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();
    }

    // If co-views are insufficient, supplement with top products in the same category
    if (candidates.length < limit) {
      const supplement = await Post.find({
        _id: {
          $ne: new mongoose.Types.ObjectId(productId),
          $nin: candidates.map((c) => c._id)
        },
        category: baseProduct.category,
        status: { $in: CATALOG_VISIBLE },
        ...IN_STOCK_CLAUSE
      })
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(limit * 2)
        .populate('author sellerId', 'name email avatar shopInfo isSeller sellerStatus')
        .lean();

      candidates = [...candidates, ...supplement];
    }

    const filtered = applyCatalogFilters(candidates, {
      currentUserId: userId,
      excludeIds: [productId],
      maxPerSeller: RECOMMENDATION.MAX_PER_SELLER
    }).slice(0, limit);

    const result = filtered.map((p) => ({
      ...p,
      recoSource: 'also_viewed',
      recoReason: 'Khách hàng xem sản phẩm này cũng xem'
    }));

    setCachedReco(`alsoviewed:${productId}`, result);
    return result;
  } catch (error) {
    console.warn('[RecoService] getAlsoViewed error:', error.message);
    return [];
  }
}

module.exports = {
  getRecentlyViewed,
  getForYou,
  getSimilarProducts,
  getAlsoViewed,
  applyCatalogFilters,
  cosineSimilarity
};
