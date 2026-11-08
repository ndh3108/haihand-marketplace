const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const PaymentSession = require('../models/PaymentSession');
const Transaction = require('../models/Transaction');
const { Product, Post } = require('../models/Product');
const Notification = require('../models/Notification');
const { sendNotification } = require('../utils/notificationService');
const shippingService = require('../services/shipping');
const { pickAddressFields, isCompleteAddress, formatAddress } = require('../models/schemas/Address');
const { addAddressToUser } = require('../routes/address');
const { productOwnerId, displayProductName, orderSellerId } = require('../utils/b2c');
const { buildVnpayPaymentUrl, normalizeIp } = require('../utils/vnpay');
const { recordServerEvent } = require('../services/behaviorAnalysisService');

/**
 * Helper to settle payment for a paymentSession (called by VNPAY verify/IPN or HaiPay)
 */
async function settlePaymentSession(parentOrderId, { gatewayPayload = {}, paymentMethod } = {}) {
  // Atomic state transition: Only transition if status is not already paid
  const session = await PaymentSession.findOneAndUpdate(
    { parentOrderId, status: { $ne: 'paid' } },
    {
      $set: {
        status: 'paid',
        paidAt: new Date(),
        gatewayPayload
      }
    },
    { new: true }
  );

  if (!session) {
    const verifiedSession = await PaymentSession.findOne({ parentOrderId });
    if (verifiedSession && verifiedSession.status === 'paid') {
      return { session: verifiedSession, alreadyPaid: true };
    }
    throw new Error(`Không tìm thấy phiên thanh toán với mã ${parentOrderId}`);
  }

  // Find all child orders
  const orders = await Order.find({ _id: { $in: session.orderIds } });
  for (const order of orders) {
    order.paymentStatus = 'escrow'; // Platform holds funds
    order.paidAt = new Date();
    order.status = 'Pending'; // Ready for seller to prepare
    await order.save();

    // Increase seller pendingBalance
    const sId = orderSellerId(order);
    if (sId) {
      await User.findByIdAndUpdate(sId, {
        $inc: { pendingBalance: order.totalPrice * 0.95 }
      });
    }

    // Notify seller in real-time
    try {
      if (sId) {
        await sendNotification({
          userId: sId,
          shopId: sId,
          recipientRole: 'seller',
          type: 'NEW_ORDER',
          orderId: order._id,
          title: '🎉 Đơn hàng mới đã thanh toán!',
          message: `Khách hàng vừa thanh toán đơn hàng #${order._id.toString().slice(-6).toUpperCase()} trị giá ${(order.totalPrice || 0).toLocaleString('vi-VN')} đ qua ${order.paymentMethod}. Hãy chuẩn bị hàng nhé!`,
          link: '/seller-channel/orders',
          targetUrl: '/seller-channel/orders'
        });
      }
    } catch (notifErr) {
      console.warn('Notification to seller error:', notifErr.message);
    }
  }

  // Deduct inventory for purchased items
  if (Array.isArray(session.purchasedItems)) {
    for (const item of session.purchasedItems) {
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        const post = await Post.findById(item.productId);
        if (post) {
          const qty = Number(item.quantity) || 1;
          const currentStock = post.stockQuantity ?? post.quantity ?? 0;
          const nextStock = Math.max(0, currentStock - qty);
          post.stockQuantity = nextStock;
          post.quantity = nextStock;
          if (nextStock === 0) post.status = 'out_of_stock';
          await post.save();
        }
      }
    }
  }

  // Clear purchased items from buyer's cart
  const buyer = await User.findById(session.buyer);
  if (buyer && Array.isArray(buyer.cart)) {
    const purchasedIdsStr = session.purchasedItems.map((p) => p.productId.toString());
    buyer.cart = buyer.cart.filter(
      (c) => c.product && !purchasedIdsStr.includes(c.product.toString())
    );
    await buyer.save();
  }

  return { session, orders, alreadyPaid: false };
}

/**
 * POST /api/checkout
 * Main multi-vendor checkout endpoint
 */
async function processCheckout(req, res) {
  try {
    const buyerId = req.user ? req.user._id : req.body.userId;
    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiến hành đặt hàng' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin tài khoản người mua' });
    }

    const {
      items, // array of { productId, quantity } or string ids
      shippingAddress: rawAddress,
      saveAsDefault = false,
      paymentMethod = 'COD'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng' });
    }

    // 1. Resolve and validate Shipping Address
    let targetAddress = null;
    if (rawAddress && typeof rawAddress === 'object') {
      targetAddress = pickAddressFields(rawAddress);
    } else if (buyer.addresses && buyer.addresses.length > 0) {
      const def = buyer.addresses.find((a) => a.isDefault) || buyer.addresses[0];
      targetAddress = pickAddressFields(def);
    }

    if (!targetAddress || !isCompleteAddress(targetAddress)) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đầy đủ địa chỉ giao hàng (Họ tên, SĐT, Đường/Số nhà, Tỉnh/Thành, Quận/Huyện, Phường/Xã)'
      });
    }

    // Save as default in address book if requested
    if (saveAsDefault) {
      try {
        await addAddressToUser(buyer._id, targetAddress, { makeDefault: true });
      } catch (addrErr) {
        console.warn('Failed to save default address:', addrErr.message);
      }
    }

    // 2. Normalize requested items
    const normalizedItems = [];
    const buyerCart = Array.isArray(buyer.cart) ? buyer.cart : [];

    for (const it of items) {
      let pId = null;
      let qty = 1;
      if (typeof it === 'string' || mongoose.Types.ObjectId.isValid(it)) {
        pId = it.toString();
        const cartMatch = buyerCart.find((c) => c.product && c.product.toString() === pId);
        qty = cartMatch ? Math.max(1, parseInt(cartMatch.quantity, 10) || 1) : 1;
      } else if (it && (it.productId || it._id || it.product)) {
        pId = (it.productId || it._id || it.product).toString();
        const rawQty = it.quantity !== undefined ? it.quantity : 1;
        const parsed = parseInt(rawQty, 10);
        if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed) || String(rawQty).includes('.')) {
          return res.status(400).json({ message: 'Số lượng sản phẩm không hợp lệ (phải là số nguyên dương >= 1)' });
        }
        qty = parsed;
      }
      if (pId && mongoose.Types.ObjectId.isValid(pId)) {
        normalizedItems.push({ productId: pId, quantity: qty });
      }
    }

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ' });
    }

    // 3. Load products from DB and check stock server-side
    const productIds = normalizedItems.map((n) => n.productId);
    const dbProducts = await Post.find({ _id: { $in: productIds } });
    if (!dbProducts || dbProducts.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong hệ thống' });
    }

    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    // Group items by sellerId
    const groupsBySeller = {};
    for (const item of normalizedItems) {
      const p = productMap.get(item.productId);
      if (!p) continue;

      let sId = productOwnerId(p);
      if (!sId || !mongoose.Types.ObjectId.isValid(sId)) {
        sId = buyer._id.toString(); // Fallback
      }

      if (!groupsBySeller[sId]) {
        groupsBySeller[sId] = [];
      }
      groupsBySeller[sId].push({
        product: p,
        quantity: item.quantity
      });
    }

    const sellerIds = Object.keys(groupsBySeller);
    if (sellerIds.length === 0) {
      return res.status(400).json({ message: 'Không thể khởi tạo nhóm sản phẩm theo người bán' });
    }

    // 4. Calculate dynamic shipping fee per seller package
    let totalItemsSubtotal = 0;
    let totalShippingFee = 0;
    const sellerPackages = [];

    for (const sId of sellerIds) {
      const pkgItems = groupsBySeller[sId];
      let pkgItemsSubtotal = 0;
      const orderItems = [];

      for (const { product: p, quantity: qty } of pkgItems) {
        const unitPrice = Number(p.price) || 0;
        const currentStock = p.stockQuantity ?? p.quantity ?? 0;
        if (currentStock < qty) {
          return res.status(400).json({
            message: `Sản phẩm "${displayProductName(p)}" chỉ còn ${currentStock} cái trong kho, không đủ số lượng ${qty}.`
          });
        }

        pkgItemsSubtotal += unitPrice * qty;
        orderItems.push({
          productId: p._id,
          name: displayProductName(p),
          price: unitPrice,
          quantity: qty,
          weight: Number(p.weight) || 500,
          image: (p.images && p.images[0]) || ''
        });
      }

      // Calculate real/mock shipping quote server-side
      let shippingQuote;
      try {
        shippingQuote = await shippingService.quotePackage({
          sellerId: sId,
          items: pkgItems.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          toAddress: targetAddress
        });
      } catch (shipErr) {
        console.warn(`Shipping calculation warning for seller ${sId}:`, shipErr.message);
        // Fallback standard fee if seller has not configured address yet
        shippingQuote = {
          fee: 25000,
          provider: 'mock',
          carrier: 'HaiHand Express (Tiêu chuẩn)'
        };
      }

      const pkgShippingFee = Math.max(0, Number(shippingQuote.fee) || 0);
      const pkgTotal = pkgItemsSubtotal + pkgShippingFee;

      totalItemsSubtotal += pkgItemsSubtotal;
      totalShippingFee += pkgShippingFee;

      sellerPackages.push({
        sellerId: sId,
        orderItems,
        itemIds: pkgItems.map((i) => i.product._id),
        itemsSubtotal: pkgItemsSubtotal,
        shippingFee: pkgShippingFee,
        totalPrice: pkgTotal,
        shippingService: {
          provider: shippingQuote.provider || '',
          serviceId: shippingQuote.serviceId,
          serviceTypeId: shippingQuote.serviceTypeId,
          expectedDeliveryTime: shippingQuote.expectedDeliveryTime
        }
      });
    }

    const finalAmount = totalItemsSubtotal + totalShippingFee;

    // Check HaiPay balance if using wallet
    if (paymentMethod === 'HAIPAY') {
      if (!buyer.isWalletActive) {
        return res.status(400).json({ message: 'Bạn chưa kích hoạt Ví HaiPay. Vui lòng kích hoạt trong mục Ví!' });
      }
      if ((buyer.walletBalance || 0) < finalAmount) {
        return res.status(400).json({
          message: `Số dư Ví HaiPay không đủ (Hiện có: ${(buyer.walletBalance || 0).toLocaleString('vi-VN')} đ, Cần thanh toán: ${finalAmount.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền!`
        });
      }
    }

    // 5. Generate parentOrderId sharing across all sub-orders
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const parentOrderId = `HH${dateStr}${randSuffix}`;

    // 6. Create Order documents
    const savedOrders = [];
    const formattedAddressStr = formatAddress(targetAddress);

    for (const pkg of sellerPackages) {
      const newOrder = new Order({
        parentOrderId,
        buyer: buyer._id,
        buyerId: buyer._id,
        seller: pkg.sellerId,
        sellerId: pkg.sellerId,
        items: pkg.itemIds,
        orderItems: pkg.orderItems,
        itemsSubtotal: pkg.itemsSubtotal,
        shippingFee: pkg.shippingFee,
        totalPrice: pkg.totalPrice,
        phone: targetAddress.phone,
        address: formattedAddressStr,
        shippingAddress: targetAddress,
        shippingService: pkg.shippingService,
        paymentMethod,
        paymentStatus: paymentMethod === 'HAIPAY' ? 'escrow' : 'unpaid',
        status: 'Pending'
      });

      await newOrder.save();
      savedOrders.push(newOrder);
    }

    // 7. Create PaymentSession
    const paymentSession = new PaymentSession({
      parentOrderId,
      buyer: buyer._id,
      orderIds: savedOrders.map((o) => o._id),
      purchasedItems: normalizedItems.map((n) => ({
        productId: n.productId,
        quantity: n.quantity
      })),
      itemsSubtotal: totalItemsSubtotal,
      shippingTotal: totalShippingFee,
      amount: finalAmount,
      method: paymentMethod,
      status: paymentMethod === 'HAIPAY' ? 'paid' : (paymentMethod === 'COD' ? 'pending' : 'pending'),
      paidAt: paymentMethod === 'HAIPAY' ? new Date() : undefined
    });
    await paymentSession.save();

    // 8. Handle Payment Method branches
    let paymentUrl = null;

    if (paymentMethod === 'HAIPAY') {
      // Deduct wallet balance atomically with conditional query (Prevents TOCTOU Double-Spending)
      const updatedBuyer = await User.findOneAndUpdate(
        {
          _id: buyer._id,
          isWalletActive: true,
          walletBalance: { $gte: finalAmount }
        },
        {
          $inc: { walletBalance: -finalAmount }
        },
        { new: true }
      );

      if (!updatedBuyer) {
        // Rollback created sub-orders and session upon balance or concurrency failure
        await Order.deleteMany({ parentOrderId });
        await PaymentSession.deleteOne({ parentOrderId });
        return res.status(400).json({
          message: 'Số dư Ví HaiPay không đủ hoặc giao dịch bị từ chối do xung đột đồng thời. Vui lòng thử lại!'
        });
      }

      // Record transaction ledger
      try {
        await Transaction.create({
          user: buyer._id,
          type: 'Thanh toán đơn hàng',
          amount: -finalAmount,
          status: 'Thành công',
          txnRef: parentOrderId,
          description: `Thanh toán đơn hàng #${parentOrderId} bằng Ví HaiPay`
        });
      } catch (txErr) {
        console.warn('Lỗi ghi Transaction ví:', txErr.message);
      }

      // Settle session right away
      await settlePaymentSession(parentOrderId, {
        gatewayPayload: { type: 'HAIPAY_WALLET', buyerBalanceAfter: updatedBuyer.walletBalance }
      });
    } else if (paymentMethod === 'COD') {
      // Deduct inventory & remove purchased items from cart immediately
      for (const item of normalizedItems) {
        const post = productMap.get(item.productId);
        if (post) {
          const currentStock = post.stockQuantity ?? post.quantity ?? 0;
          const nextStock = Math.max(0, currentStock - item.quantity);
          post.stockQuantity = nextStock;
          post.quantity = nextStock;
          if (nextStock === 0) post.status = 'out_of_stock';
          await post.save();
        }
      }

      const purchasedIdsStr = normalizedItems.map((n) => n.productId);
      buyer.cart = buyerCart.filter(
        (c) => c.product && !purchasedIdsStr.includes(c.product.toString())
      );
      await buyer.save();

      // Notify sellers in real-time
      for (const order of savedOrders) {
        try {
          const sId = orderSellerId(order);
          if (sId) {
            await sendNotification({
              userId: sId,
              shopId: sId,
              recipientRole: 'seller',
              type: 'NEW_ORDER',
              orderId: order._id,
              title: '🎉 Đơn hàng mới (COD)!',
              message: `Bạn có đơn hàng COD #${order._id.toString().slice(-6).toUpperCase()} trị giá ${(order.totalPrice || 0).toLocaleString('vi-VN')} đ. Hãy chuẩn bị hàng nhé!`,
              link: '/seller-channel/orders',
              targetUrl: '/seller-channel/orders'
            });
          }
        } catch (e) {}
      }
    } else if (paymentMethod === 'VNPAY') {
      // Generate VNPAY payment URL using parentOrderId
      const ipAddr = normalizeIp(req);
      paymentUrl = buildVnpayPaymentUrl({
        orderId: parentOrderId,
        amount: finalAmount,
        ipAddr,
        orderInfo: `Thanh toan don hang HaiHand ${parentOrderId}`
      });
    }

    // Buyer notification in real-time
    try {
      await sendNotification({
        userId: buyer._id,
        recipientRole: 'buyer',
        type: 'ORDER',
        title: '📦 Đặt hàng thành công!',
        message: `Đơn hàng ${parentOrderId} gồm ${savedOrders.length} gói hàng đã được khởi tạo thành công.`,
        link: '/profile?tab=orders_buy',
        targetUrl: '/profile?tab=orders_buy'
      });
    } catch (e) {}

    // Server-side purchase tracking for behavioral recommendation engine
    try {
      for (const order of savedOrders) {
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            recordServerEvent({
              userId: buyer._id,
              type: 'purchase',
              productId: item.productId,
              price: item.price,
              source: 'checkout',
              meta: {
                orderId: order._id,
                parentOrderId,
                paymentMethod,
                quantity: item.quantity
              }
            });
          }
        }
      }
    } catch (trackErr) {
      console.warn('Purchase event tracking warning:', trackErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Đặt hàng thành công!',
      parentOrderId,
      amount: finalAmount,
      itemsSubtotal: totalItemsSubtotal,
      shippingTotal: totalShippingFee,
      orders: savedOrders,
      paymentUrl,
      paymentMethod
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      message: 'Lỗi trong quá trình tạo đơn hàng: ' + error.message,
      error: error.message
    });
  }
}

module.exports = {
  processCheckout,
  settlePaymentSession
};
