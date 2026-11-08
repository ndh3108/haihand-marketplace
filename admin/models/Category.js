const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String },
  icon: { type: String },
  date: { type: Date, default: Date.now },
}, { timestamps: true, strict: false });

module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
