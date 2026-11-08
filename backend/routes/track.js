const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const UserEvent = require('../models/UserEvent');
const { Product, Post } = require('../models/Product');
const { resolveUserIdentity, requireVerifiedUser } = require('../middleware/trackAuth');
const {
  updateProfileIncremental,
  updateCoViewMatrix,
  mergeUserIdentity
} = require('../services/behaviorAnalysisService');
const {
  ALLOWED_EVENT_TYPES,
  ALLOWED_SOURCES,
  SENSITIVE_FIELDS,
  RATE_LIMIT,
  MAX_BATCH_SIZE
} = require('../config/behaviorConfig');

// In-memory sliding rate limiter per IP or anonymousId
const rateLimitMap = new Map();

function isRateLimited(key) {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record || now - record.resetTime > RATE_LIMIT.WINDOW_MS) {
    record = { count: 1, resetTime: now };
    rateLimitMap.set(key, record);
    return false;
  }

  record.count += 1;
  return record.count > RATE_LIMIT.MAX_REQUESTS;
}

// Clean up memory map periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.resetTime > RATE_LIMIT.WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// Bot & Crawler Detection Pattern
const BOT_REGEX = /(bot|crawl|spider|slurp|facebookexternalhit|whatsapp|headless|postman|curl|wget|python-requests)/i;

/**
 * Sanitize and whitelist metadata to prevent sensitive data leakage
 */
function sanitizeMeta(metaObj) {
  if (!metaObj || typeof metaObj !== 'object' || Array.isArray(metaObj)) {
    return {};
  }
  const clean = {};
  for (const [k, v] of Object.entries(metaObj)) {
    if (SENSITIVE_FIELDS.includes(k.toLowerCase())) continue;
    // Only accept primitive safe types
    if (typeof v === 'string') clean[k] = v.slice(0, 200);
    else if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
  }
  return clean;
}

/**
 * POST /api/track
 * Collect a batch of up to 20 user events
 */
router.post('/track', resolveUserIdentity, async (req, res) => {
  try {
    // 1. Detect and silently ignore automated crawlers/bots
    const userAgent = req.headers['user-agent'] || '';
    if (BOT_REGEX.test(userAgent)) {
      return res.status(200).json({ success: true, count: 0, ignored: 'bot' });
    }

    // 2. Rate limit by verified userId, anonymousId or client IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateKey = req.userId || req.anonymousId || clientIp;
    if (isRateLimited(rateKey)) {
      return res.status(429).json({ message: 'Quá nhiều yêu cầu tracking, vui lòng thử lại sau.' });
    }

    // 3. Normalize events input (accept either an array or single event object)
    let rawEvents = req.body.events;
    if (!rawEvents && req.body.type) {
      rawEvents = [req.body];
    }

    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return res.status(400).json({ message: 'Danh sách sự kiện không hợp lệ' });
    }

    // Cap batch size to MAX_BATCH_SIZE (20)
    const cappedEvents = rawEvents.slice(0, MAX_BATCH_SIZE);
    const validEventsToSave = [];

    // Pre-load products being viewed to filter out self-views by the product owner
    const viewProductIds = [];
    for (const item of cappedEvents) {
      if (item.type === 'product_view' && item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        viewProductIds.push(new mongoose.Types.ObjectId(item.productId));
      }
    }

    const productOwnerMap = new Map();
    if (viewProductIds.length > 0) {
      const prods = await Post.find({ _id: { $in: viewProductIds } }).select('author sellerId category price').lean();
      for (const p of prods) {
        const owner = (p.sellerId || p.author || '').toString();
        productOwnerMap.set(p._id.toString(), {
          owner,
          category: p.category,
          price: p.price
        });
      }
    }

    for (const item of cappedEvents) {
      if (!item || typeof item !== 'object') continue;

      // Validate event type
      const type = String(item.type || '').trim();
      if (!ALLOWED_EVENT_TYPES.includes(type)) continue;

      // Extract & validate anonymousId
      const anonId = String(item.anonymousId || req.anonymousId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      if (!anonId) continue;

      // Extract & validate productId
      let pId = null;
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        pId = new mongoose.Types.ObjectId(item.productId);
      }

      // Check self-view: ignore view if user views their own shop's product
      if (type === 'product_view' && pId && req.userId) {
        const prodInfo = productOwnerMap.get(pId.toString());
        if (prodInfo && prodInfo.owner === req.userId) {
          // Skip logging view from product owner
          continue;
        }
      }

      // Enrich category and price from DB if not passed
      let category = typeof item.category === 'string' ? item.category.trim().slice(0, 100) : '';
      let price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : null;
      if (pId && productOwnerMap.has(pId.toString())) {
        const dbInfo = productOwnerMap.get(pId.toString());
        if (!category && dbInfo.category) category = dbInfo.category;
        if (price === null && typeof dbInfo.price === 'number') price = dbInfo.price;
      }

      const source = ALLOWED_SOURCES.includes(item.source) ? item.source : 'other';
      const sessionId = typeof item.sessionId === 'string' ? item.sessionId.trim().slice(0, 64) : '';
      const query = typeof item.query === 'string' ? item.query.trim().slice(0, 200) : '';

      validEventsToSave.push({
        userId: req.userId ? new mongoose.Types.ObjectId(req.userId) : null,
        anonymousId: anonId,
        sessionId,
        type,
        productId: pId,
        category,
        price,
        query,
        source,
        meta: sanitizeMeta(item.meta),
        createdAt: new Date()
      });
    }

    if (validEventsToSave.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    // Insert events into DB
    const savedDocs = await UserEvent.insertMany(validEventsToSave, { ordered: false });

    // Non-blocking asynchronous update of Profile and Co-view
    setImmediate(async () => {
      try {
        await updateProfileIncremental(savedDocs);
        await updateCoViewMatrix(savedDocs);
      } catch (bgErr) {
        console.warn('[Track] Async background enrichment warning:', bgErr.message);
      }
    });

    return res.status(200).json({
      success: true,
      count: savedDocs.length
    });
  } catch (error) {
    console.error('[Track] Error logging user events:', error);
    // Never crash or return 500 to tracker clients
    return res.status(200).json({ success: false, error: 'Tracking silent fail', count: 0 });
  }
});

/**
 * POST /api/track/merge
 * Merge anonymous events and profile into the authenticated user profile
 */
router.post('/track/merge', requireVerifiedUser, async (req, res) => {
  try {
    const { anonymousId } = req.body;
    if (!anonymousId || typeof anonymousId !== 'string') {
      return res.status(400).json({ message: 'Thiếu anonymousId cần gộp' });
    }

    const cleanAnon = anonymousId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const result = await mergeUserIdentity(cleanAnon, req.userId);

    return res.status(200).json({
      success: true,
      message: 'Gộp danh tính thành công',
      ...result
    });
  } catch (error) {
    console.error('[Track] Error merging user identity:', error);
    return res.status(500).json({ message: 'Lỗi gộp danh tính: ' + error.message });
  }
});

/**
 * GET /api/track/status
 * Health check endpoint for tracking service
 */
router.get('/track/status', (req, res) => {
  res.json({
    status: 'active',
    ttlDays: 90,
    maxBatch: MAX_BATCH_SIZE
  });
});

module.exports = router;

