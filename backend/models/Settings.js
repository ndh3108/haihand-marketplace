const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  platformFeePercentage: { type: Number, default: 5, min: 0, max: 50 },
  commissionRate: { type: Number, default: 5, min: 0, max: 50 }, // Platform commission %
  autoApprovePosts: { type: Boolean, default: false },
  maintenanceMode: { type: Boolean, default: false },
  bannerAnnouncement: { type: String, default: '' },
  allowNewSellerRegistration: { type: Boolean, default: true },
  codEnabled: { type: Boolean, default: true },
  vnpayEnabled: { type: Boolean, default: true },
  haipayEnabled: { type: Boolean, default: true },
  supportHotline: { type: String, default: '1900-6868' },
  contactEmail: { type: String, default: 'cskh@haihand.vn' },
  supportEmail: { type: String, default: 'cskh@haihand.vn' }
}, { timestamps: true });

settingsSchema.pre('save', function (next) {
  if (this.platformFeePercentage != null && this.commissionRate == null) {
    this.commissionRate = this.platformFeePercentage;
  }
  if (this.commissionRate != null && this.platformFeePercentage == null) {
    this.platformFeePercentage = this.commissionRate;
  }
  if (this.contactEmail && !this.supportEmail) {
    this.supportEmail = this.contactEmail;
  }
  if (this.supportEmail && !this.contactEmail) {
    this.contactEmail = this.supportEmail;
  }
  if (typeof next === 'function') next();
});

// Ensure single document pattern
settingsSchema.statics.getGlobal = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
const GlobalSetting = mongoose.models.GlobalSetting || mongoose.model('GlobalSetting', settingsSchema, 'settings');

module.exports = Settings;
module.exports.GlobalSetting = GlobalSetting;
module.exports.Settings = Settings;
