const mongoose = require("mongoose");

const globalSettingSchema = new mongoose.Schema({
  platformFeePercentage: { type: Number, default: 5, min: 0, max: 50 },
  commissionRate: { type: Number, default: 5, min: 0, max: 50 },
  autoApprovePosts: { type: Boolean, default: false },
  maintenanceMode: { type: Boolean, default: false },
  contactEmail: { type: String, default: "cskh@haihand.vn" },
  supportHotline: { type: String, default: "1900-6868" }
}, { timestamps: true, strict: false });

globalSettingSchema.statics.getGlobal = async function () {
  let setting = await this.findOne();
  if (!setting) {
    setting = await this.create({});
  }
  return setting;
};

// Shares the 'settings' collection with backend/models/Settings.js (singleton document)
const GlobalSetting = mongoose.models.GlobalSetting || mongoose.model("GlobalSetting", globalSettingSchema, "settings");
module.exports = GlobalSetting;
