const mongoose = require('mongoose');

const cardRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    referenceNumber: { type: String, required: true },
    consumerId: { type: String },
    cardTypeId: { type: String, required: true },
    cardTypeName: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    panNumber: { type: String, required: true },
    aadharNumber: { type: String, required: true },
    panDocName: { type: String },
    panDocData: { type: String },
    monthlyIncome: { type: Number },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    creditLimitApproved: { type: Number },
    adminRemarks: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CardRequest', cardRequestSchema);

