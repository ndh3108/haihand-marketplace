const mongoose = require('mongoose');

/**
 * Structured Vietnamese address.
 * IDs follow the shipping provider's master data (GHN: ProvinceID / DistrictID / WardCode)
 * so that fee calculation and shipment creation can be done without geocoding.
 */
const addressFields = {
  fullName: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  street: { type: String, default: '', trim: true },
  provinceId: { type: Number },
  provinceName: { type: String, default: '' },
  districtId: { type: Number },
  districtName: { type: String, default: '' },
  wardCode: { type: String, default: '' },
  wardName: { type: String, default: '' }
};

// For user address books (each entry has its own _id + default flag)
const AddressBookSchema = new mongoose.Schema(
  { ...addressFields, isDefault: { type: Boolean, default: false } },
  { _id: true, timestamps: false }
);

// For immutable snapshots embedded in orders / shop pickup info
const AddressSnapshotSchema = new mongoose.Schema(addressFields, { _id: false });

function formatAddress(a) {
  if (!a) return '';
  return [a.street, a.wardName, a.districtName, a.provinceName]
    .map((p) => (p || '').toString().trim())
    .filter(Boolean)
    .join(', ');
}

function isCompleteAddress(a) {
  return Boolean(
    a &&
    a.fullName && a.phone && a.street &&
    a.provinceId && a.districtId && a.wardCode
  );
}

function pickAddressFields(src = {}) {
  return {
    fullName: (src.fullName || '').toString().trim(),
    phone: (src.phone || '').toString().trim(),
    street: (src.street || '').toString().trim(),
    provinceId: src.provinceId != null && src.provinceId !== '' ? Number(src.provinceId) : undefined,
    provinceName: (src.provinceName || '').toString().trim(),
    districtId: src.districtId != null && src.districtId !== '' ? Number(src.districtId) : undefined,
    districtName: (src.districtName || '').toString().trim(),
    wardCode: (src.wardCode || '').toString().trim(),
    wardName: (src.wardName || '').toString().trim()
  };
}

module.exports = {
  AddressBookSchema,
  AddressSnapshotSchema,
  formatAddress,
  isCompleteAddress,
  pickAddressFields
};
