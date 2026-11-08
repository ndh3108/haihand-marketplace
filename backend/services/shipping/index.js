/**
 * Shipping service facade.
 * Chooses provider by SHIPPING_PROVIDER env (`ghn` | `mock`). Falls back to mock
 * automatically if GHN credentials are missing so local dev never breaks.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const { Post } = require('../../models/Product');
const { isCompleteAddress, formatAddress } = require('../../models/schemas/Address');
const { productOwnerId } = require('../../utils/b2c');
const ghn = require('./ghnProvider');
const mock = require('./mockProvider');

function provider() {
  const wanted = (process.env.SHIPPING_PROVIDER || '').toLowerCase().trim();
  if (wanted === 'mock') return mock;
  if (wanted === 'ghn') return ghn;
  if (ghn.isConfigured()) return ghn;
  return mock;
}

class ShippingError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function sellerOrigin(seller) {
  const p = seller?.shopInfo?.pickupAddress;
  if (isCompleteAddress(p)) {
    return {
      fullName: p.fullName || seller.shopInfo?.shopName || seller.name,
      phone: p.phone || seller.shopInfo?.phone || seller.phone,
      street: p.street,
      provinceId: p.provinceId, provinceName: p.provinceName,
      districtId: p.districtId, districtName: p.districtName,
      wardCode: p.wardCode, wardName: p.wardName
    };
  }

  // Fallback to seller default address in address book if available
  const def = (seller?.addresses || []).find((a) => a.isDefault) || (seller?.addresses || [])[0];
  if (isCompleteAddress(def)) {
    return {
      fullName: def.fullName || seller.shopInfo?.shopName || seller.name,
      phone: def.phone || seller.shopInfo?.phone || seller.phone,
      street: def.street,
      provinceId: def.provinceId, provinceName: def.provinceName,
      districtId: def.districtId, districtName: def.districtName,
      wardCode: def.wardCode, wardName: def.wardName
    };
  }

  // If in mock mode, provide safe default origin warehouse so demo/test orders can always be prepared
  if (provider().NAME === 'mock') {
    return {
      fullName: seller?.shopInfo?.shopName || seller?.name || 'Kho Tổng HaiHand',
      phone: seller?.shopInfo?.phone || seller?.phone || '0901234567',
      street: '123 Nguyễn Huệ',
      provinceId: 202, provinceName: 'Hồ Chí Minh',
      districtId: 1442, districtName: 'Quận 1',
      wardCode: '144201', wardName: 'Phường Bến Nghé'
    };
  }

  return null;
}

/**
 * Resolve a seller package from raw items, validating ownership/stock server-side.
 * @param {string} sellerId
 * @param {{productId:string, quantity:number}[]} rawItems
 */
async function resolvePackage(sellerId, rawItems) {
  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    throw new ShippingError('Mã người bán không hợp lệ', 'INVALID_SELLER');
  }
  const seller = await User.findById(sellerId).select('name phone shopInfo isSeller sellerStatus');
  if (!seller) throw new ShippingError('Không tìm thấy người bán', 'SELLER_NOT_FOUND', 404);

  const ids = (rawItems || []).map((i) => i.productId).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const products = await Post.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  let weight = 0;
  let subtotal = 0;
  const items = [];
  for (const raw of rawItems || []) {
    const p = byId.get(String(raw.productId));
    if (!p) continue;
    if (productOwnerId(p) !== String(sellerId)) {
      throw new ShippingError(`Sản phẩm "${p.name || p.title}" không thuộc shop này`, 'OWNER_MISMATCH');
    }
    const qty = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    const unitWeight = Number(p.weight) || 500;
    weight += unitWeight * qty;
    subtotal += (Number(p.price) || 0) * qty;
    items.push({ product: p, quantity: qty, unitWeight });
  }
  if (items.length === 0) throw new ShippingError('Gói hàng không có sản phẩm hợp lệ', 'EMPTY_PACKAGE');

  return { seller, items, weight, subtotal };
}

/**
 * Quote one seller package.
 * @returns {Promise<{fee:number, provider:string, carrier:string, serviceId?:number, serviceTypeId?:number, expectedDeliveryTime?:Date, weight:number}>}
 */
async function quotePackage({ sellerId, items, toAddress }) {
  if (!isCompleteAddress(toAddress)) {
    throw new ShippingError('Địa chỉ nhận hàng chưa đầy đủ (Tỉnh/Quận/Phường)', 'INCOMPLETE_DESTINATION');
  }
  const pkg = await resolvePackage(sellerId, items);
  const from = sellerOrigin(pkg.seller);
  if (!from) {
    throw new ShippingError(
      `Shop "${pkg.seller.shopInfo?.shopName || pkg.seller.name}" chưa thiết lập địa chỉ lấy hàng`,
      'SELLER_NO_PICKUP_ADDRESS'
    );
  }
  const p = provider();
  try {
    const q = await p.calculateFee({ from, to: toAddress, weight: pkg.weight, insuranceValue: pkg.subtotal });
    return { ...q, weight: pkg.weight, subtotal: pkg.subtotal, pkg };
  } catch (err) {
    console.error(`[Shipping:${p.NAME}] calculateFee failed:`, err.message);
    throw new ShippingError('Không tính được phí vận chuyển: ' + err.message, 'PROVIDER_ERROR', 502);
  }
}

/** Create a carrier shipment for a persisted Order. */
async function createShipmentForOrder(order) {
  const seller = await User.findById(order.sellerId || order.seller).select('name phone shopInfo');
  const from = sellerOrigin(seller);
  if (!from) throw new ShippingError('Shop chưa thiết lập địa chỉ lấy hàng (Cài đặt Shop)', 'SELLER_NO_PICKUP_ADDRESS');
  const to = order.shippingAddress;
  if (!isCompleteAddress(to)) {
    throw new ShippingError('Đơn hàng thiếu địa chỉ giao hàng có cấu trúc, không thể tạo vận đơn tự động', 'INCOMPLETE_DESTINATION');
  }
  const weight = (order.orderItems || []).reduce((s, i) => s + (Number(i.weight) || 500) * (i.quantity || 1), 0) || 500;
  const codAmount = order.paymentMethod === 'COD' ? order.totalPrice : 0;

  const p = provider();
  try {
    return await p.createShipment({ order, from, to, weight, codAmount, items: order.orderItems });
  } catch (err) {
    console.error(`[Shipping:${p.NAME}] createShipment failed:`, err.message);
    throw new ShippingError('Đơn vị vận chuyển từ chối tạo vận đơn: ' + err.message, 'PROVIDER_ERROR', 502);
  }
}

module.exports = {
  provider,
  ShippingError,
  sellerOrigin,
  resolvePackage,
  quotePackage,
  createShipmentForOrder,
  formatAddress,
  getProvinces: () => provider().getProvinces(),
  getDistricts: (id) => provider().getDistricts(id),
  getWards: (id) => provider().getWards(id)
};
