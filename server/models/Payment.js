const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  transactionRef: { type: String, required: true, unique: true },
  consumerId: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  planTypeId: { type: String },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['UPI', 'NETBANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'WALLET', 'CASH'], default: 'UPI' },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  reference: { type: String, default: '' },
  source: { type: String, default: 'online' },
  receiptUrl: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('Payment', PaymentSchema);
