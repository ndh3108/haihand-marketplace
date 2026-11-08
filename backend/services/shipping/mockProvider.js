const crypto = require('crypto');
const loc = require('./vnLocations');

/**
 * Deterministic mock carrier ("HaiHand Express").
 * Fee model (approximates GHN standard service):
 *   same district   : 15,000đ
 *   same province   : 22,000đ
 *   same region     : 30,000đ
 *   cross region    : 38,000đ
 *   + 5,000đ per extra 500g above the first 500g (capped at 50kg billing)
 */
const NAME = 'mock';
const CARRIER_LABEL = 'HaiHand Express';

function baseFee(from, to) {
  if (Number(from.districtId) === Number(to.districtId)) return 15000;
  if (Number(from.provinceId) === Number(to.provinceId)) return 22000;
  if (loc.regionOf(from.provinceId) === loc.regionOf(to.provinceId)) return 30000;
  return 38000;
}

function etaDays(from, to) {
  if (Number(from.provinceId) === Number(to.provinceId)) return 1;
  if (loc.regionOf(from.provinceId) === loc.regionOf(to.provinceId)) return 2;
  return 4;
}

async function calculateFee({ from, to, weight }) {
  const grams = Math.min(Math.max(Number(weight) || 500, 1), 50000);
  const extraSteps = Math.max(0, Math.ceil((grams - 500) / 500));
  const fee = baseFee(from, to) + extraSteps * 5000;
  const eta = new Date(Date.now() + etaDays(from, to) * 86400000);
  return {
    provider: NAME,
    carrier: CARRIER_LABEL,
    fee,
    serviceId: 53320,
    serviceTypeId: 2,
    expectedDeliveryTime: eta
  };
}

async function createShipment({ order, from, to, weight, codAmount }) {
  const quote = await calculateFee({ from, to, weight });
  const trackingCode = 'HHX' + crypto.randomBytes(4).toString('hex').toUpperCase();
  return {
    provider: NAME,
    carrier: CARRIER_LABEL,
    trackingCode,
    fee: quote.fee,
    expectedDeliveryTime: quote.expectedDeliveryTime,
    raw: { mock: true, clientOrderCode: order._id.toString(), codAmount }
  };
}

async function getProvinces() {
  return loc.provinces.map(({ id, name }) => ({ id, name, ProvinceID: id, ProvinceName: name }));
}
async function getDistricts(provinceId) {
  return (loc.districtsByProvince[Number(provinceId)] || []).map((d) => ({
    ...d,
    DistrictID: d.id,
    DistrictName: d.name
  }));
}
async function getWards(districtId) {
  return (loc.wardsByDistrict[Number(districtId)] || []).map((w) => ({
    ...w,
    WardCode: w.code,
    WardName: w.name
  }));
}

module.exports = { NAME, CARRIER_LABEL, calculateFee, createShipment, getProvinces, getDistricts, getWards };
