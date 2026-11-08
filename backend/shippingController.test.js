/**
 * Integration & Unit Tests for GHN Shipment Order Creation Controller
 * File: shippingController.test.js
 */

const request = require('supertest');
const express = require('express');

// 1. Mock dependencies trước khi require controller
jest.mock('axios');
jest.mock('./models/Order');
jest.mock('./utils/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
  sendAdminNotification: jest.fn().mockResolvedValue(true)
}));

const axios = require('axios');
const Order = require('./models/Order');
const { createShipmentGHN } = require('./controllers/shippingController');

// Khởi tạo app Express giả lập cho Supertest
const app = express();
app.use(express.json());
app.post('/api/seller/orders/:orderId/ship', createShipmentGHN);

describe('POST /api/seller/orders/:orderId/ship - Tạo đơn giao hàng GHN', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GHN_TOKEN: 'mock_ghn_token_123',
      GHN_SHOP_ID: 'mock_shop_id_456'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Case 1 (Success): Gửi thông tin hợp lệ -> Mock Axios trả về status 200 kèm order_code
   * -> Kiểm tra HTTP response trả về 200 và hàm update DB được gọi đúng với status 'Processing'.
   */
  test('Case 1 (Success): Tạo đơn GHN thành công với thông tin hợp lệ', async () => {
    const mockOrder = {
      _id: '66a123456789abcdef012345',
      trackingCode: '',
      shippingCode: '',
      status: 'Pending',
      shippingAddress: {
        fullName: 'Nguyễn Văn A',
        phone: '0987654321',
        street: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
        wardCode: '20308',
        districtId: 1442
      },
      orderItems: [
        { name: 'Áo thun HaiHand', quantity: 2, weight: 250 },
        { name: 'Nón lưỡi trai', quantity: 1, weight: 150 }
      ],
      shipment: {},
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock Order.findById chaining .populate()
    Order.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockOrder)
    });

    // Mock Axios response từ GHN API
    const mockGhnResponse = {
      data: {
        code: 200,
        message: 'Success',
        data: {
          order_code: 'GHN_TEST_998877',
          total_fee: 28000,
          expected_delivery_time: '2026-11-01T10:00:00.000Z'
        }
      }
    };
    axios.post.mockResolvedValue(mockGhnResponse);

    // Gửi request test
    const res = await request(app).post('/api/seller/orders/66a123456789abcdef012345/ship');

    // Kiểm tra kết quả HTTP Response
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order_code).toBe('GHN_TEST_998877');
    expect(res.body.trackingCode).toBe('GHN_TEST_998877');
    expect(res.body.message).toMatch(/thành công/i);

    // Kiểm tra Axios được gọi với đúng Endpoint, Payload và Headers
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [callUrl, callPayload, callConfig] = axios.post.mock.calls[0];
    expect(callUrl).toBe('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create');
    expect(callConfig.headers.Token).toBe('mock_ghn_token_123');
    expect(callConfig.headers.ShopId).toBe('mock_shop_id_456');
    expect(callPayload.payment_type_id).toBe(2);
    expect(callPayload.required_note).toBe('KHONGCHOXEMHANG');
    expect(callPayload.to_name).toBe('Nguyễn Văn A');
    expect(callPayload.to_phone).toBe('0987654321');
    expect(callPayload.to_address).toBe('123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1');
    expect(callPayload.to_ward_code).toBe('20308');
    expect(callPayload.to_district_id).toBe(1442);
    expect(callPayload.weight).toBe(650); // 250*2 + 150*1 = 650g
    expect(callPayload.length).toBe(15);
    expect(callPayload.width).toBe(15);
    expect(callPayload.height).toBe(15);
    expect(callPayload.items).toEqual([
      { name: 'Áo thun HaiHand', quantity: 2, weight: 250 },
      { name: 'Nón lưỡi trai', quantity: 1, weight: 150 }
    ]);

    // Kiểm tra cập nhật DB Order
    expect(mockOrder.status).toBe('Processing');
    expect(mockOrder.trackingCode).toBe('GHN_TEST_998877');
    expect(mockOrder.shippingCode).toBe('GHN_TEST_998877');
    expect(mockOrder.shipment.provider).toBe('ghn');
    expect(mockOrder.shipment.fee).toBe(28000);
    expect(mockOrder.save).toHaveBeenCalledTimes(1);
  });

  /**
   * Case 2 (Fail - Missing Data): Đơn hàng thiếu địa chỉ hoặc to_phone -> Kiểm tra HTTP response trả về 400.
   */
  describe('Case 2 (Fail - Missing Data): Thiếu thông tin người nhận', () => {
    test('Trả về 400 khi đơn hàng thiếu số điện thoại (to_phone)', async () => {
      const mockOrderNoPhone = {
        _id: 'order_missing_phone_1',
        shippingAddress: {
          fullName: 'Trần Thị B',
          phone: '', // Thiếu số điện thoại
          street: '456 Lê Lợi, Quận 1',
          wardCode: '20308',
          districtId: 1442
        },
        phone: '',
        orderItems: [{ name: 'Váy hoa', quantity: 1, weight: 200 }],
        save: jest.fn()
      };

      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrderNoPhone)
      });

      const res = await request(app).post('/api/seller/orders/order_missing_phone_1/ship');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/thiếu số điện thoại/i);
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockOrderNoPhone.save).not.toHaveBeenCalled();
    });

    test('Trả về 400 khi đơn hàng thiếu địa chỉ nhận hàng (to_address)', async () => {
      const mockOrderNoAddress = {
        _id: 'order_missing_address_2',
        shippingAddress: {
          fullName: 'Lê Văn C',
          phone: '0901234567',
          street: '', // Thiếu địa chỉ đường
          wardCode: '20308',
          districtId: 1442
        },
        address: '', // Cả address lẫn street đều trống
        phone: '0901234567',
        orderItems: [{ name: 'Giày sneaker', quantity: 1, weight: 500 }],
        save: jest.fn()
      };

      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrderNoAddress)
      });

      const res = await request(app).post('/api/seller/orders/order_missing_address_2/ship');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/thiếu địa chỉ/i);
      expect(axios.post).not.toHaveBeenCalled();
      expect(mockOrderNoAddress.save).not.toHaveBeenCalled();
    });
  });

  /**
   * Case 3 (Fail - GHN Error): Mock Axios văng lỗi (VD: Sai token) -> Kiểm tra HTTP response trả về 500 kèm message lỗi.
   */
  test('Case 3 (Fail - GHN Error): Mock Axios văng lỗi (VD: Sai token) -> Trả về lỗi 500 kèm message', async () => {
    const mockOrder = {
      _id: 'order_ghn_error_3',
      shippingAddress: {
        fullName: 'Phạm Văn D',
        phone: '0912345678',
        street: '789 CMT8, Phường 5, Tân Bình',
        wardCode: '20308',
        districtId: 1442
      },
      orderItems: [{ name: 'Balo laptop', quantity: 1, weight: 800 }],
      save: jest.fn()
    };

    Order.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockOrder)
    });

    // Mock Axios ném lỗi xác thực từ GHN (Invalid Token)
    const ghnAuthError = new Error('Token không hợp lệ hoặc đã hết hạn');
    ghnAuthError.response = {
      status: 500,
      data: {
        code: 401,
        message: 'Token is invalid or expired',
        code_message_value: 'Token không hợp lệ hoặc đã hết hạn'
      }
    };
    axios.post.mockRejectedValue(ghnAuthError);

    const res = await request(app).post('/api/seller/orders/order_ghn_error_3/ship');

    // Kiểm tra HTTP Response trả về 500
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/thất bại|Token không hợp lệ/i);
    // Đảm bảo không lưu Order nếu GHN báo lỗi
    expect(mockOrder.save).not.toHaveBeenCalled();
  });
});
