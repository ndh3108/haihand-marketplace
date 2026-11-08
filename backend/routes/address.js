const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { pickAddressFields, isCompleteAddress, formatAddress } = require('../models/schemas/Address');

const router = express.Router();
const MAX_ADDRESSES = 10;

/** Ensure exactly one default and keep legacy `address`/`phone` strings in sync. */
function normalizeBook(user) {
  const list = user.addresses || [];
  if (list.length && !list.some((a) => a.isDefault)) list[0].isDefault = true;
  let seen = false;
  list.forEach((a) => {
    if (a.isDefault && !seen) seen = true;
    else a.isDefault = false;
  });
  const def = list.find((a) => a.isDefault);
  if (def) {
    user.address = formatAddress(def);
    if (!user.phone && def.phone) user.phone = def.phone;
  }
}

/**
 * Shared helper (also used by checkout): add an address to the user's book.
 * @returns the created sub-document
 */
async function addAddressToUser(userId, raw, { makeDefault = false } = {}) {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('Không tìm thấy người dùng'), { status: 404 });
  const fields = pickAddressFields(raw);
  if (!isCompleteAddress(fields)) throw Object.assign(new Error('Địa chỉ chưa đầy đủ'), { status: 400 });

  // De-duplicate identical addresses
  const dup = user.addresses.find((a) =>
    a.street === fields.street && a.wardCode === fields.wardCode &&
    Number(a.districtId) === Number(fields.districtId) && a.phone === fields.phone && a.fullName === fields.fullName
  );
  let entry = dup;
  if (!entry) {
    if (user.addresses.length >= MAX_ADDRESSES) {
      throw Object.assign(new Error(`Tối đa ${MAX_ADDRESSES} địa chỉ`), { status: 400 });
    }
    user.addresses.push({ ...fields, isDefault: false });
    entry = user.addresses[user.addresses.length - 1];
  }
  if (makeDefault || user.addresses.length === 1) {
    user.addresses.forEach((a) => { a.isDefault = a._id.equals(entry._id); });
  }
  normalizeBook(user);
  await user.save();
  return { user, entry };
}

router.get('/', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses address phone name');
  res.json({
    addresses: user.addresses || [],
    legacyAddress: (user.addresses || []).length === 0 ? (user.address || '') : '',
    profile: { name: user.name, phone: user.phone }
  });
});

router.post('/', protect, async (req, res) => {
  try {
    const { entry, user } = await addAddressToUser(req.user._id, req.body, { makeDefault: !!req.body.isDefault });
    res.status(201).json({ address: entry, addresses: user.addresses });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ' });
    const user = await User.findById(req.user._id);
    const entry = user.addresses.id(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
    const fields = pickAddressFields(req.body);
    if (!isCompleteAddress(fields)) return res.status(400).json({ message: 'Địa chỉ chưa đầy đủ' });
    entry.set(fields);
    if (req.body.isDefault) user.addresses.forEach((a) => { a.isDefault = a._id.equals(entry._id); });
    normalizeBook(user);
    await user.save();
    res.json({ address: entry, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/default', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  const entry = user.addresses.id(req.params.id);
  if (!entry) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
  user.addresses.forEach((a) => { a.isDefault = a._id.equals(entry._id); });
  normalizeBook(user);
  await user.save();
  res.json({ addresses: user.addresses });
});

router.delete('/:id', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  const entry = user.addresses.id(req.params.id);
  if (!entry) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
  entry.deleteOne();
  normalizeBook(user);
  await user.save();
  res.json({ addresses: user.addresses });
});

module.exports = router;
module.exports.addAddressToUser = addAddressToUser;
