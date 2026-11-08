const express = require('express');
const { protect } = require('../middleware/auth');
const shipping = require('../services/shipping');
const { pickAddressFields } = require('../models/schemas/Address');

const router = express.Router();

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[Shipping route]', err);
    res.status(status).json({ message: err.message || 'Lỗi vận chuyển', code: err.code });
  }
};

// ---- Master data (public; used by address forms) ----
router.get('/provider', (req, res) => {
  const p = shipping.provider();
  res.json({ provider: p.NAME, carrier: p.CARRIER_LABEL });
});

router.get('/provinces', handle(async (req, res) => {
  res.json(await shipping.getProvinces());
}));

router.get('/districts', handle(async (req, res) => {
  if (!req.query.provinceId) return res.status(400).json({ message: 'Thiếu provinceId' });
  res.json(await shipping.getDistricts(req.query.provinceId));
}));

router.get('/wards', handle(async (req, res) => {
  if (!req.query.districtId) return res.status(400).json({ message: 'Thiếu districtId' });
  res.json(await shipping.getWards(req.query.districtId));
}));

/**
 * POST /api/shipping/calculate
 * Body: { sellerId, toAddress, items: [{ productId, quantity }] }
 * Origin address + product weights are always loaded server-side.
 */
router.post('/calculate', protect, handle(async (req, res) => {
  const { sellerId, toAddress, items } = req.body || {};
  if (!sellerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Thiếu sellerId hoặc danh sách sản phẩm', code: 'BAD_REQUEST' });
  }
  const q = await shipping.quotePackage({ sellerId, items, toAddress: pickAddressFields(toAddress) });
  res.json({
    sellerId,
    fee: q.fee,
    provider: q.provider,
    carrier: q.carrier,
    serviceId: q.serviceId,
    serviceTypeId: q.serviceTypeId,
    expectedDeliveryTime: q.expectedDeliveryTime,
    weight: q.weight
  });
}));

module.exports = router;
