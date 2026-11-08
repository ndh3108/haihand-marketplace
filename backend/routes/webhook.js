const express = require('express');
const router = express.Router();
const { handleGHNWebhook } = require('../controllers/webhookController');

/**
 * Route: POST /api/webhook/ghn
 * Mô tả: Endpoint công khai (Public) nhận dữ liệu trạng thái đơn hàng thời gian thực từ GHN.
 * Lưu ý: KHÔNG gắn middleware xác thực (protect / requireAdmin) để máy chủ GHN có thể gọi trực tiếp.
 */
router.post('/ghn', handleGHNWebhook);

module.exports = router;

