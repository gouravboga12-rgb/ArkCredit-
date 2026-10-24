const mongoose = require('mongoose');

const ConsumerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  address: { type: String, default: '' },
  accountNumber: { type: String, index: true },
  status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },
  passwordHash: { type: String, default: 'Demo@123' },
  cardApproved: { type: Boolean, default: false },
  creditLimit: { type: Number, default: 0 },
  cardStatus: { type: String, default: 'not_applied' },
  cardNumber: { type: String, default: '' },
  notificationPreferences: {
    pushEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    emiReminders: { type: Boolean, default: true },
    promotionalOffers: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Consumer', ConsumerSchema);
