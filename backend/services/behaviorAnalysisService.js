const mongoose = require('mongoose');
const UserEvent = require('../models/UserEvent');
const UserInterestProfile = require('../models/UserInterestProfile');
const ProductCoView = require('../models/ProductCoView');
const { Product, Post } = require('../models/Product');
const {
  EVENT_WEIGHTS,
  HALF_LIFE_MS,
  RECOMMENDATION
} = require('../config/behaviorConfig');

/**
 * Calculate exponential time decay for an existing score
 * Formula: decayed = score * 0.5 ^ (elapsed / HALF_LIFE)
 */
function applyDecay(score, lastUpdated, now = new Date()) {
  if (!score || score <= 0) return 0;
  const elapsed = Math.max(0, new Date(now).getTime() - new Date(lastUpdated).getTime());
  const factor = Math.pow(0.5, elapsed / HALF_LIFE_MS);
  return Number((score * factor).toFixed(4));
}

/**
 * Calculate median and IQR for an array of numbers
 */
function calculatePriceStats(prices = []) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return { median: 0, iqr: 0, minPreferred: 0, maxPreferred: 0, sampleCount: 0 };
  }

  const sorted = [...prices].filter((p) => typeof p === 'number' && !isNaN(p) && p >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { median: 0, iqr: 0, minPreferred: 0, maxPreferred: 0, sampleCount: 0 };
  }

  const getPercentile = (arr, p) => {
    const index = (arr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  const median = Math.round(getPercentile(sorted, 0.5));
  const q1 = getPercentile(sorted, 0.25);
  const q3 = getPercentile(sorted, 0.75);
  const iqr = Math.max(0, Math.round(q3 - q1));

  const minPreferred = Math.max(0, Math.round(median - 1.5 * iqr));
  const maxPreferred = Math.round(median + 1.5 * iqr);

  return {
    median,
    iqr,
    minPreferred: minPreferred === 0 && maxPreferred === 0 ? median : minPreferred,
    maxPreferred: maxPreferred === 0 ? median * 2 : maxPreferred,
    sampleCount: sorted.length
  };
}

/**
 * Sanitize map keys to prevent Mongoose / MongoDB dot-notation errors
 */
function sanitizeKey(key) {
  if (!key) return '';
  return String(key).replace(/\./g, '').trim();
}

/**
 * Determine user segment based on historical interaction signals
 */
function determineSegment(profileData, events = []) {
  const hasPurchased = (profileData.purchasedProductIds && profileData.purchasedProductIds.length > 0) ||
    events.some((e) => e.type === 'purchase');
  if (hasPurchased) return 'buyer';

  const cartOrFavCount = events.filter((e) => ['cart_add', 'favorite_add'].includes(e.type)).length;
  if (cartOrFavCount >= 1) return 'high_intent';

  const viewCount = events.filter((e) => ['product_view', 'product_dwell'].includes(e.type)).length;
  if (viewCount >= 3) return 'browsing';

  return profileData.segment || 'new';
}

/**
 * Record a user event from the server side (e.g. checkout, cart, favorite)
 */
async function recordServerEvent({
  userId = null,
  anonymousId = 'server-generated',
  sessionId = '',
  type,
  productId = null,
  category = '',
  price = null,
  query = '',
  source = 'other',
  meta = {}
}) {
  try {
    let finalCategory = category;
    let finalPrice = price;

    if (productId && (!finalCategory || finalPrice === null)) {
      try {
        const prod = await Post.findById(productId).select('category price').lean();
        if (prod) {
          if (!finalCategory) finalCategory = prod.category;
          if (finalPrice === null) finalPrice = prod.price;
        }
      } catch (err) {
        // Silent fail on metadata enrichment
      }
    }

    const event = new UserEvent({
      userId: userId ? new mongoose.Types.ObjectId(userId) : null,
      anonymousId: String(anonymousId || 'server-generated'),
      sessionId: String(sessionId || ''),
      type,
      productId: productId ? new mongoose.Types.ObjectId(productId) : null,
      category: finalCategory || '',
      price: typeof finalPrice === 'number' ? finalPrice : null,
      query: query || '',
      source: source || 'other',
      meta: meta || {},
      createdAt: new Date()
    });

    await event.save();

    // Trigger asynchronous incremental profile update
    setImmediate(async () => {
      try {
        await updateProfileIncremental([event]);
        if (type === 'product_view') {
          await updateCoViewMatrix([event]);
        }
      } catch (e) {
        console.warn('[BehaviorAnalysis] Async profile update warning:', e.message);
      }
    });

    return event;
  } catch (error) {
    console.warn('[BehaviorAnalysis] recordServerEvent error:', error.message);
    return null;
  }
}

/**
 * Update UserInterestProfile incrementally for a batch of events
 */
async function updateProfileIncremental(events = []) {
  if (!Array.isArray(events) || events.length === 0) return;

  // Group events by target identity: prefer userId if present, else anonymousId
  const groups = new Map();
  for (const ev of events) {
    const key = ev.userId ? `u:${ev.userId.toString()}` : (ev.anonymousId ? `a:${ev.anonymousId}` : null);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  }

  const now = new Date();

  for (const [key, evList] of groups.entries()) {
    try {
      const isUser = key.startsWith('u:');
      const idVal = key.slice(2);

      const query = isUser
        ? { userId: new mongoose.Types.ObjectId(idVal) }
        : { anonymousId: idVal };

      let profile = await UserInterestProfile.findOne(query);
      if (!profile) {
        profile = new UserInterestProfile({
          userId: isUser ? new mongoose.Types.ObjectId(idVal) : null,
          anonymousId: isUser ? null : idVal,
          categories: new Map(),
          preferredConditions: new Map(),
          preferredLocations: new Map(),
          sellerAffinity: new Map(),
          recentProductIds: [],
          purchasedProductIds: [],
          segment: 'new',
          lastEventAt: now
        });
      }

      // Convert Mongoose Map to native Map for manipulation
      const catMap = profile.categories instanceof Map ? profile.categories : new Map(Object.entries(profile.categories || {}));
      const condMap = profile.preferredConditions instanceof Map ? profile.preferredConditions : new Map(Object.entries(profile.preferredConditions || {}));
      const locMap = profile.preferredLocations instanceof Map ? profile.preferredLocations : new Map(Object.entries(profile.preferredLocations || {}));
      const sellerMap = profile.sellerAffinity instanceof Map ? profile.sellerAffinity : new Map(Object.entries(profile.sellerAffinity || {}));

      const recentIds = new Set((profile.recentProductIds || []).map((id) => id.toString()));
      const purchasedIds = new Set((profile.purchasedProductIds || []).map((id) => id.toString()));

      // Apply decay to existing category scores first
      for (const [cat, score] of catMap.entries()) {
        const decayed = applyDecay(score, profile.lastEventAt || profile.updatedAt || now, now);
        catMap.set(cat, decayed);
      }

      const collectedPrices = [];

      for (const ev of evList) {
        let weight = EVENT_WEIGHTS[ev.type] || 1.0;

        // Custom weight for dwell duration
        if (ev.type === 'product_dwell') {
          const duration = ev.meta?.duration || ev.meta?.dwellSeconds || 0;
          if (duration >= RECOMMENDATION.SIGNIFICANT_DWELL_SECONDS) {
            weight = EVENT_WEIGHTS.product_dwell;
          } else if (duration >= RECOMMENDATION.MIN_DWELL_SECONDS) {
            weight = EVENT_WEIGHTS.product_view;
          } else {
            continue; // Skip dwell under 5 seconds
          }
        }

        // Category score
        if (ev.category && typeof ev.category === 'string') {
          const cleanCat = sanitizeKey(ev.category);
          if (cleanCat) {
            const currentCatScore = catMap.get(cleanCat) || 0;
            const nextScore = Math.max(0, currentCatScore + weight);
            catMap.set(cleanCat, Number(nextScore.toFixed(3)));
          }
        }

        // Collect prices for price preference
        if (typeof ev.price === 'number' && ev.price > 0 && ['product_view', 'cart_add', 'favorite_add', 'purchase'].includes(ev.type)) {
          collectedPrices.push(ev.price);
        }

        // Product list updates
        if (ev.productId) {
          const pidStr = ev.productId.toString();
          if (ev.type === 'purchase') {
            purchasedIds.add(pidStr);
          } else if (['product_view', 'product_dwell', 'favorite_add', 'cart_add'].includes(ev.type)) {
            // Keep recent viewed/interacted
            if (!recentIds.has(pidStr)) {
              recentIds.add(pidStr);
            }
          }

          // Condition and Location preference from meta (if available)
          if (ev.meta?.condition) {
            const cleanCond = sanitizeKey(ev.meta.condition);
            if (cleanCond) {
              const currentCond = condMap.get(cleanCond) || 0;
              condMap.set(cleanCond, currentCond + weight);
            }
          }
          if (ev.meta?.location) {
            const cleanLoc = sanitizeKey(ev.meta.location);
            if (cleanLoc) {
              const currentLoc = locMap.get(cleanLoc) || 0;
              locMap.set(cleanLoc, currentLoc + weight);
            }
          }
          if (ev.meta?.sellerId) {
            const sid = sanitizeKey(ev.meta.sellerId);
            if (sid) {
              const currentSeller = sellerMap.get(sid) || 0;
              sellerMap.set(sid, currentSeller + weight);
            }
          }
        }
      }

      // Compute updated price stats if new prices were recorded
      if (collectedPrices.length > 0) {
        const existingMedian = profile.priceRange?.median || 0;
        const allPrices = existingMedian > 0 ? [existingMedian, ...collectedPrices] : collectedPrices;
        profile.priceRange = calculatePriceStats(allPrices);
      }

      // Keep recent product IDs up to 50 items
      const recentArray = Array.from(recentIds).slice(-50).map((id) => new mongoose.Types.ObjectId(id));
      profile.recentProductIds = recentArray;
      profile.purchasedProductIds = Array.from(purchasedIds).map((id) => new mongoose.Types.ObjectId(id));

      profile.categories = catMap;
      profile.preferredConditions = condMap;
      profile.preferredLocations = locMap;
      profile.sellerAffinity = sellerMap;

      // Update segment
      profile.segment = determineSegment(profile, evList);
      profile.lastEventAt = now;

      await profile.save();
    } catch (profErr) {
      console.warn(`[BehaviorAnalysis] Profile update failed for key ${key}:`, profErr.message);
    }
  }
}

/**
 * Increment Co-View matrix based on session / user product views
 */
async function updateCoViewMatrix(events = []) {
  const viewEvents = events.filter((e) => e.type === 'product_view' && e.productId);
  if (viewEvents.length === 0) return;

  for (const ev of viewEvents) {
    try {
      const pid = ev.productId;
      const targetQuery = {
        type: 'product_view',
        productId: { $ne: pid },
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // within past 2 hours
      };

      if (ev.sessionId) {
        targetQuery.sessionId = ev.sessionId;
      } else if (ev.userId) {
        targetQuery.userId = ev.userId;
      } else if (ev.anonymousId) {
        targetQuery.anonymousId = ev.anonymousId;
      } else {
        continue;
      }

      // Find other products viewed in the same context
      const otherViews = await UserEvent.find(targetQuery)
        .select('productId')
        .limit(10)
        .lean();

      for (const other of otherViews) {
        if (!other.productId || other.productId.toString() === pid.toString()) continue;
        const coPid = other.productId;

        // Upsert bidirectional co-view pair
        await ProductCoView.findOneAndUpdate(
          { productId: pid, coViewedProductId: coPid },
          { $inc: { count: 1 }, $set: { lastUpdated: new Date() } },
          { upsert: true, new: true }
        );

        await ProductCoView.findOneAndUpdate(
          { productId: coPid, coViewedProductId: pid },
          { $inc: { count: 1 }, $set: { lastUpdated: new Date() } },
          { upsert: true, new: true }
        );
      }
    } catch (covErr) {
      // Co-view is a background enrichment; ignore duplicate key errors or minor conflicts
    }
  }
}

/**
 * Merge an anonymous identity into a logged-in userId
 */
async function mergeUserIdentity(anonymousId, userId) {
  if (!anonymousId || !userId) return { success: false, mergedCount: 0 };

  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    // 1. Reassign all anonymous UserEvents to the authenticated userId
    const updateResult = await UserEvent.updateMany(
      { anonymousId, userId: null },
      { $set: { userId: userObjectId } }
    );

    // 2. Merge anonymous UserInterestProfile into the user's UserInterestProfile
    const anonProfile = await UserInterestProfile.findOne({ anonymousId });
    if (anonProfile) {
      let userProfile = await UserInterestProfile.findOne({ userId: userObjectId });
      if (!userProfile) {
        // Re-link the anonymous profile to the user
        anonProfile.userId = userObjectId;
        anonProfile.anonymousId = null;
        await anonProfile.save();
      } else {
        // Merge category scores
        const anonCats = anonProfile.categories instanceof Map ? anonProfile.categories : new Map(Object.entries(anonProfile.categories || {}));
        const userCats = userProfile.categories instanceof Map ? userProfile.categories : new Map(Object.entries(userProfile.categories || {}));

        for (const [cat, score] of anonCats.entries()) {
          const existing = userCats.get(cat) || 0;
          userCats.set(cat, Number((existing + score).toFixed(3)));
        }
        userProfile.categories = userCats;

        // Merge recent products
        const mergedRecent = new Set([
          ...(userProfile.recentProductIds || []).map((id) => id.toString()),
          ...(anonProfile.recentProductIds || []).map((id) => id.toString())
        ]);
        userProfile.recentProductIds = Array.from(mergedRecent).slice(-50).map((id) => new mongoose.Types.ObjectId(id));

        // Merge purchased products
        const mergedPurchased = new Set([
          ...(userProfile.purchasedProductIds || []).map((id) => id.toString()),
          ...(anonProfile.purchasedProductIds || []).map((id) => id.toString())
        ]);
        userProfile.purchasedProductIds = Array.from(mergedPurchased).map((id) => new mongoose.Types.ObjectId(id));

        userProfile.lastEventAt = new Date();
        await userProfile.save();

        // Remove the orphan anonymous profile
        await UserInterestProfile.deleteOne({ _id: anonProfile._id });
      }
    }

    return {
      success: true,
      mergedCount: updateResult.modifiedCount || 0
    };
  } catch (error) {
    console.error('[BehaviorAnalysis] mergeUserIdentity error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Nightly maintenance: decay old profile scores and clean stale data
 */
async function runNightlyMaintenance() {
  const now = new Date();
  console.log(`[BehaviorAnalysis] Running nightly maintenance at ${now.toISOString()}...`);

  try {
    // 1. Decay profiles inactive for more than 1 day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleProfiles = await UserInterestProfile.find({
      lastEventAt: { $lt: oneDayAgo }
    }).limit(500);

    let decayedCount = 0;
    for (const prof of staleProfiles) {
      if (prof.categories && prof.categories.size > 0) {
        for (const [cat, score] of prof.categories.entries()) {
          prof.categories.set(cat, applyDecay(score, prof.lastEventAt, now));
        }
        prof.lastEventAt = now;
        await prof.save();
        decayedCount++;
      }
    }

    // 2. Clean co-view entries with only 1 count that are older than 60 days
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const cleanedCoViews = await ProductCoView.deleteMany({
      count: 1,
      lastUpdated: { $lt: sixtyDaysAgo }
    });

    console.log(`[BehaviorAnalysis] Maintenance completed: decayed ${decayedCount} profiles, removed ${cleanedCoViews.deletedCount} stale co-views.`);
  } catch (err) {
    console.error('[BehaviorAnalysis] Nightly maintenance failed:', err.message);
  }
}

module.exports = {
  applyDecay,
  calculatePriceStats,
  determineSegment,
  recordServerEvent,
  updateProfileIncremental,
  updateCoViewMatrix,
  mergeUserIdentity,
  runNightlyMaintenance
};

