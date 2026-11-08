const express = require('express');
const router = express.Router();
const { resolveUserIdentity } = require('../middleware/trackAuth');
const {
  getRecentlyViewed,
  getForYou,
  getSimilarProducts,
  getAlsoViewed
} = require('../services/recommendationService');

/**
 * 1. GET /api/recommendations/recently-viewed
 * Products previously viewed by current user or anonymous session
 */
router.get('/recommendations/recently-viewed', resolveUserIdentity, async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const items = await getRecentlyViewed({
      userId: req.userId,
      anonymousId: req.anonymousId,
      limit
    });
    return res.status(200).json(items);
  } catch (error) {
    console.warn('[RecoRoute] recently-viewed silent fallback:', error.message);
    return res.status(200).json([]);
  }
});

/**
 * 2. GET /api/recommendations/for-you
 * Personalized hybrid recommendations
 */
router.get('/recommendations/for-you', resolveUserIdentity, async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const items = await getForYou({
      userId: req.userId,
      anonymousId: req.anonymousId,
      limit
    });
    return res.status(200).json(items);
  } catch (error) {
    console.warn('[RecoRoute] for-you silent fallback:', error.message);
    return res.status(200).json([]);
  }
});

/**
 * 3. GET /api/recommendations/similar/:productId
 * Similar products by vector embedding or category/price range
 */
router.get('/recommendations/similar/:productId', resolveUserIdentity, async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const items = await getSimilarProducts({
      productId,
      userId: req.userId,
      limit
    });
    return res.status(200).json(items);
  } catch (error) {
    console.warn('[RecoRoute] similar silent fallback:', error.message);
    return res.status(200).json([]);
  }
});

/**
 * 4. GET /api/recommendations/also-viewed/:productId
 * Products co-viewed with this item
 */
router.get('/recommendations/also-viewed/:productId', resolveUserIdentity, async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const items = await getAlsoViewed({
      productId,
      userId: req.userId,
      limit
    });
    return res.status(200).json(items);
  } catch (error) {
    console.warn('[RecoRoute] also-viewed silent fallback:', error.message);
    return res.status(200).json([]);
  }
});

module.exports = router;

