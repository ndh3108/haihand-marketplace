/**
 * Automated Backend QA Test Suite: GHN Real-time Shipping Webhook
 * File: backend/webhook.test.js
 */

const request = require('supertest');
const express = require('express');

// 1. Mock Order model trước khi require controller/route
jest.mock('./models/Order');

const Order = require('./models/Order');
const webhookRouter = require('./routes/webhook');

// Khởi tạo Express app độc lập để test endpoint POST /api/webhook/ghn (không có auth middleware)
const app = express();
app.use(express.json());
app.use('/api/webhook', webhookRouter);

describe('POST /api/webhook/ghn - GHN Real-time Shipping Tracking Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Case 1 (Core Requirement):
   * Gửi POST request tới /api/webhook/ghn với GHN JSON payload mẫu
   * -> HTTP Response trả về 200 OK ({ success: true })
   * -> Mock Database đẩy bản ghi mới vào mảng trackingLogs và cập nhật shippingStatus
   */
  test('Case 1 (Success): Nhận GHN Webhook, trả về 200 OK và push log mới vào trackingLogs', async () => {
    const mockOrder = {
      _id: '66b998877665544332211000',
      status: 'Processing',
      shippingStatus: 'ready_to_pick',
      trackingLogs: [
        {
          status: 'ready_to_pick',
          description: 'Đơn hàng mới tạo, đang chờ nhân viên GHN tới lấy hàng',
          updated_at: new Date('2026-10-30T08:00:00.000Z')
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };

    Order.findById.mockResolvedValue(mockOrder);

    const ghnWebhookPayload = {
      ClientOrderCode: '66b998877665544332211000',
      OrderCode: 'GHN_LIVE_889900',
      Status: 'delivering',
      Reason: 'Nhân viên giao hàng đang trên đường giao tới người nhận',
      Type: 'switch_status',
      Time: '2026-10-30T10:30:00.000Z'
    };

    const res = await request(app)
      .post('/api/webhook/ghn')
      .send(ghnWebhookPayload)
      .set('Content-Type', 'application/json');

    // 1. Assert HTTP response là 200 OK kèm { success: true }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 2. Assert Order.findById được gọi với đúng ClientOrderCode
    expect(Order.findById).toHaveBeenCalledTimes(1);
    expect(Order.findById).toHaveBeenCalledWith('66b998877665544332211000');

    // 3. Assert shippingStatus chính của Order được cập nhật thành 'delivering'
    expect(mockOrder.shippingStatus).toBe('delivering');

    // 4. Assert mock Database đã push log mới vào mảng trackingLogs
    expect(mockOrder.trackingLogs).toHaveLength(2);
    const latestLog = mockOrder.trackingLogs[1];
    expect(latestLog).toEqual(
      expect.objectContaining({
        status: 'delivering',
        description: 'Nhân viên giao hàng đang trên đường giao tới người nhận'
      })
    );
    expect(latestLog.updated_at).toBeInstanceOf(Date);

    // 5. Assert order.save() được gọi để lưu xuống DB
    expect(mockOrder.save).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case 2: Trạng thái 'delivered' đồng bộ trạng thái đơn hàng sang 'Delivered'
   */
  test('Case 2 (Delivered): Cập nhật shippingStatus = delivered và đồng bộ Order.status = Delivered', async () => {
    const mockOrder = {
      _id: '66b998877665544332211001',
      status: 'Shipped',
      shippingStatus: 'delivering',
      trackingLogs: [],
      save: jest.fn().mockResolvedValue(true)
    };

    Order.findById.mockResolvedValue(mockOrder);

    const res = await request(app)
      .post('/api/webhook/ghn')
      .send({
        ClientOrderCode: '66b998877665544332211001',
        Status: 'delivered',
        Reason: 'Giao hàng thành công. Người nhận: Nguyễn Văn A'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockOrder.shippingStatus).toBe('delivered');
    expect(mockOrder.status).toBe('Delivered');
    expect(mockOrder.trackingLogs).toHaveLength(1);
    expect(mockOrder.trackingLogs[0].status).toBe('delivered');
    expect(mockOrder.trackingLogs[0].description).toBe('Giao hàng thành công. Người nhận: Nguyễn Văn A');
    expect(mockOrder.save).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case 3: Validation - Thiếu ClientOrderCode hoặc Status trả về 400 Bad Request
   */
  test('Case 3 (Validation): Trả về 400 khi payload thiếu ClientOrderCode hoặc Status', async () => {
    const res = await request(app)
      .post('/api/webhook/ghn')
      .send({
        Reason: 'Payload thiếu mã đơn và trạng thái'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Order.findById).not.toHaveBeenCalled();
  });

  /**
   * Test Case 4: Order Not Found - Không tìm thấy đơn hàng tương ứng với ClientOrderCode
   */
  test('Case 4 (Not Found): Trả về 404 khi ClientOrderCode không tồn tại trong DB', async () => {
    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/webhook/ghn')
      .send({
        ClientOrderCode: 'non_existent_order_id',
        Status: 'picking',
        Reason: 'Đang lấy hàng'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  /**
   * Test Case 5: Error Handling - Lỗi kết nối Database trả về 500
   */
  test('Case 5 (Database Error): Trả về 500 khi Database gặp sự cố bất ngờ', async () => {
    Order.findById.mockRejectedValue(new Error('MongoDB connection lost'));

    const res = await request(app)
      .post('/api/webhook/ghn')
      .send({
        ClientOrderCode: '66b998877665544332211000',
        Status: 'picking',
        Reason: 'Shipper đang tới lấy hàng'
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('MongoDB connection lost');
  });
});

