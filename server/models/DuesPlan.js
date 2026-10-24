const mongoose = require('mongoose');

const DuesPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  consumerId: { type: String, required: true, index: true },
  planTypeId: { type: String, required: true },
  title: { type: String, required: true },
  productName: { type: String, default: '' },
  referenceNumber: { type: String, default: '' },
  status: { type: String, enum: ['active', 'completed', 'defaulted'], default: 'active' },
  outstandingAmount: { type: Number, required: true },
  totalPaymentDue: { type: Number, required: true },
  principal: { type: Number, required: true },
  interest: { type: Number, default: 0 },
  processingFee: { type: Number, default: 0 },
  emiAmount: { type: Number, required: true },
  nextEmiDate: { type: String, required: true },
  totalEmis: { type: Number, required: true },
  remainingEmis: { type: Number, required: true },
  tenureWeeks: { type: Number, default: 12 },
  frequency: { type: String, enum: ['weekly', 'monthly'], default: 'weekly' },
  linkedCardTypeId: { type: String, default: 'card_emi_privilege' },
  overdueAmount: { type: Number, default: 0 },
  missedWeeks: { type: Number, default: 0 },
  missedMonths: { type: Number, default: 0 },
  overdueRemarks: { type: String, default: '' },
  overdueAssignedAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('DuesPlan', DuesPlanSchema);
