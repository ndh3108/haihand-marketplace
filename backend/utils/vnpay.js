const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');

const vnp_TmnCode = process.env.VNP_TMNCODE || 'IYQYHLU4';
const vnp_HashSecret = process.env.VNP_HASHSECRET || 'BBZJECZFZLUQSVOBCVTQSPDPYQZKGUEB';
const vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const vnp_ReturnUrl = process.env.VNP_RETURNURL || 'http://localhost:3000/haipay/return';

function sortObject(obj) {
  const sorted = {};
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) keys.push(encodeURIComponent(key));
  }
  keys.sort();
  for (const k of keys) {
    sorted[k] = encodeURIComponent(obj[k]).replace(/%20/g, '+');
  }
  return sorted;
}

function signParams(params) {
  const signData = querystring.stringify(sortObject(params), { encode: false });
  return crypto.createHmac('sha512', vnp_HashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

/**
 * Legacy-tolerant verification: returns true when no hash is supplied.
 * Kept for backwards compatibility with old callers.
 */
function verifyVnpayChecksum(params, secureHash) {
  if (!secureHash) return true;
  return verifyVnpayChecksumStrict(params, secureHash);
}

/** Strict verification: a missing hash is a failure. */
function verifyVnpayChecksumStrict(params, secureHash) {
  if (!secureHash || !params) return false;
  const p = { ...params };
  delete p.vnp_SecureHash;
  delete p.vnp_SecureHashType;
  return secureHash.toLowerCase() === signParams(p).toLowerCase();
}

function buildVnpayPaymentUrl({ orderId, amount, ipAddr = '127.0.0.1', orderInfo, returnUrl }) {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnp_TmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId.toString(),
    vnp_OrderInfo: orderInfo || ('Thanh toan don hang HaiHand ' + orderId),
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: returnUrl || vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: moment(new Date()).format('YYYYMMDDHHmmss')
  };
  const sorted = sortObject(params);
  sorted.vnp_SecureHash = signParams(params);
  return vnp_Url + '?' + querystring.stringify(sorted, { encode: false });
}

function normalizeIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  ip = ip.toString().split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

module.exports = {
  vnp_TmnCode,
  vnp_HashSecret,
  vnp_Url,
  vnp_ReturnUrl,
  sortObject,
  signParams,
  verifyVnpayChecksum,
  verifyVnpayChecksumStrict,
  buildVnpayPaymentUrl,
  normalizeIp
};
