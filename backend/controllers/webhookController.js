const Order = require('../models/Order');

/**
 * Controller: Xử lý Webhook cập nhật trạng thái vận đơn thời gian thực từ GHN (Giao Hàng Nhanh)
 * Endpoint: POST /api/webhook/ghn
 * Access: Public (Không sử dụng auth middleware để GHN Server gọi trực tiếp)
 */
const handleGHNWebhook = async (req, res) => {
  try {
    // 1. Trích xuất thông tin từ GHN Webhook Payload
    const { ClientOrderCode, Status, Reason, OrderCode, Description } = req.body || {};

    // Kiểm tra dữ liệu bắt buộc
    if (!ClientOrderCode || !Status) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: ClientOrderCode hoặc Status từ GHN Webhook!'
      });
    }

    // 2. Tìm kiếm Order trong Database bằng ClientOrderCode (map với Order._id)
    const order = await Order.findById(ClientOrderCode);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn hàng với ClientOrderCode: ${ClientOrderCode}`
      });
    }

    // 3. Khởi tạo mảng trackingLogs nếu đơn hàng cũ chưa có
    if (!Array.isArray(order.trackingLogs)) {
      order.trackingLogs = [];
    }

    // 4. Tạo bản ghi lịch sử hành trình mới và đẩy vào mảng trackingLogs
    const logDescription =
      Reason ||
      Description ||
      `Cập nhật trạng thái vận chuyển từ GHN: ${Status}`;

    const newTrackingLog = {
      status: String(Status).trim(),
      description: String(logDescription).trim(),
      updated_at: new Date()
    };

    order.trackingLogs.push(newTrackingLog);

    // 5. Cập nhật trạng thái giao hàng chính (shippingStatus) của Order
    const normalizedStatus = String(Status).trim();
    order.shippingStatus = normalizedStatus;

    // Nếu GHN gửi kèm mã vận đơn OrderCode mà đơn hàng chưa lưu thì đồng bộ luôn
    if (OrderCode && !order.trackingCode) {
      order.trackingCode = String(OrderCode).trim();
    }

    // Đồng bộ trạng thái tổng của đơn hàng (Order.status) theo luồng nghiệp vụ sàn
    const lowerStatus = normalizedStatus.toLowerCase();
    if (lowerStatus === 'delivered') {
      order.status = 'Delivered';
      order.deliveredAt = new Date();
    } else if (['picking', 'picked', 'storing', 'transporting', 'sorting', 'delivering'].includes(lowerStatus)) {
      order.status = 'Shipped';
    } else if (['return', 'returned', 'cancel', 'lost', 'damage'].includes(lowerStatus)) {
      if (lowerStatus === 'cancel') {
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = logDescription;
      }
    }

    // 6. Lưu thay đổi vào MongoDB
    await order.save();

    // 7. Phản hồi 200 OK ngay lập tức để GHN Server không bị timeout hoặc retry
    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái vận đơn GHN thành công!',
      shippingStatus: order.shippingStatus,
      trackingLogs: order.trackingLogs
    });
  } catch (error) {
    console.error('❌ [GHN Webhook Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý GHN Webhook',
      error: error.message
    });
  }
};

module.exports = {
  handleGHNWebhook
};

