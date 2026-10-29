const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    adminUser: { type: String, required: true },
    action: { type: String, required: true },
    consumerId: { type: String, required: true },
    consumerName: { type: String },
    oldValue: { type: String, default: '-' },
    newValue: { type: String, default: '-' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);

