/**
 * GHN (Giao Hàng Nhanh) provider.
 * Docs: https://api.ghn.vn/home/docs/detail
 * Sandbox base: https://dev-online-gateway.ghn.vn/shiip/public-api
 */
const NAME = 'ghn';
const CARRIER_LABEL = 'Giao Hàng Nhanh (GHN)';

const TIMEOUT_MS = 10000;
const cache = new Map(); // master-data cache (rarely changes)

function getBaseUrl() {
  return (process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api').replace(/\/$/, '');
}

function getToken() {
  return (process.env.GHN_TOKEN || '').trim();
}

function getShopId() {
  return (process.env.GHN_SHOP_ID || '').trim();
}

function isConfigured() {
  return Boolean(getToken() && getShopId());
}

async function ghn(path, { method = 'POST', body, withShop = false } = {}) {
  const token = getToken();
  const shopId = getShopId();

  if (!token) {
    throw new Error('Chưa cấu hình GHN_TOKEN trong biến môi trường backend');
  }

  const headers = { 'Content-Type': 'application/json', Token: token };
  if (withShop) {
    if (!shopId) {
      throw new Error('Chưa cấu hình GHN_SHOP_ID trong biến môi trường backend');
    }
    headers.ShopId = String(shopId);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(getBaseUrl() + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.code && json.code !== 200)) {
      const msg = json.code_message_value || json.message || `GHN HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.ghn = json;
      throw err;
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const value = await fn();
  cache.set(key, value);
  return value;
}

async function getProvinces() {
  return cached('provinces', async () => {
    const data = await ghn('/master-data/province', { method: 'GET' });
    return (data || []).map((p) => ({ id: p.ProvinceID, name: p.ProvinceName }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  });
}

async function getDistricts(provinceId) {
  return cached(`d:${provinceId}`, async () => {
    const data = await ghn('/master-data/district', { body: { province_id: Number(provinceId) } });
    return (data || []).map((d) => ({ id: d.DistrictID, name: d.DistrictName, provinceId: d.ProvinceID }));
  });
}

async function getWards(districtId) {
  return cached(`w:${districtId}`, async () => {
    const data = await ghn('/master-data/ward', { body: { district_id: Number(districtId) } });
    return (data || []).map((w) => ({ code: w.WardCode, name: w.WardName, districtId: w.DistrictID }));
  });
}

async function pickService(fromDistrictId, toDistrictId) {
  const shopId = getShopId();
  const services = await ghn('/v2/shipping-order/available-services', {
    body: { shop_id: Number(shopId), from_district: Number(fromDistrictId), to_district: Number(toDistrictId) }
  });
  // Prefer "Hàng nhẹ" (service_type_id 2), fallback to first
  return (services || []).find((s) => s.service_type_id === 2) || (services || [])[0] || { service_type_id: 2 };
}

async function calculateFee({ from, to, weight, insuranceValue = 0 }) {
  const service = await pickService(from.districtId, to.districtId);
  const body = {
    service_type_id: service.service_type_id || 2,
    service_id: service.service_id,
    from_district_id: Number(from.districtId),
    from_ward_code: String(from.wardCode),
    to_district_id: Number(to.districtId),
    to_ward_code: String(to.wardCode),
    weight: Math.max(1, Math.round(Number(weight) || 500)),
    length: 20, width: 15, height: 10,
    insurance_value: Math.min(Math.round(insuranceValue), 5000000)
  };
  const data = await ghn('/v2/shipping-order/fee', { body, withShop: true });

  let eta;
  try {
    const lt = await ghn('/v2/shipping-order/leadtime', {
      body: {
        from_district_id: body.from_district_id, from_ward_code: body.from_ward_code,
        to_district_id: body.to_district_id, to_ward_code: body.to_ward_code,
        service_id: service.service_id
      },
      withShop: true
    });
    if (lt?.leadtime) eta = new Date(lt.leadtime * 1000);
  } catch (_) { /* leadtime is optional */ }

  return {
    provider: NAME,
    carrier: CARRIER_LABEL,
    fee: Number(data.total) || 0,
    serviceId: service.service_id,
    serviceTypeId: service.service_type_id || 2,
    expectedDeliveryTime: eta
  };
}

async function createShipment({ order, from, to, weight, codAmount, items }) {
  const body = {
    payment_type_id: 1, // shop pays carrier (buyer already paid shipping to platform)
    required_note: 'CHOXEMHANGKHONGTHU',
    client_order_code: order._id.toString(),
    from_name: from.fullName, from_phone: from.phone, from_address: from.street,
    from_ward_name: from.wardName, from_district_name: from.districtName, from_province_name: from.provinceName,
    to_name: to.fullName, to_phone: to.phone, to_address: [to.street, to.wardName, to.districtName, to.provinceName].filter(Boolean).join(', '),
    to_ward_code: String(to.wardCode), to_district_id: Number(to.districtId),
    cod_amount: Math.round(codAmount || 0),
    weight: Math.max(1, Math.round(Number(weight) || 500)),
    length: 20, width: 15, height: 10,
    insurance_value: Math.min(Math.round(order.itemsSubtotal || 0), 5000000),
    service_type_id: order.shippingService?.serviceTypeId || 2,
    items: (items || []).map((i) => ({
      name: (i.name || 'Sản phẩm').slice(0, 100),
      quantity: i.quantity || 1,
      price: Math.round(i.price || 0),
      weight: Math.max(1, Math.round(i.weight || 500))
    }))
  };
  const data = await ghn('/v2/shipping-order/create', { body, withShop: true });
  return {
    provider: NAME,
    carrier: CARRIER_LABEL,
    trackingCode: data.order_code,
    fee: Number(data.total_fee) || 0,
    expectedDeliveryTime: data.expected_delivery_time ? new Date(data.expected_delivery_time) : undefined,
    raw: data
  };
}

module.exports = {
  NAME, CARRIER_LABEL,
  isConfigured,
  calculateFee, createShipment, getProvinces, getDistricts, getWards
};
