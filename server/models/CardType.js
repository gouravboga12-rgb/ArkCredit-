const mongoose = require('mongoose');

const CardTypeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  features: [{ type: String }],
  benefits: [{ type: String }],
  charges: {
    joiningFee: { type: Number, default: 0 },
    annualFee: { type: Number, default: 0 },
    interestRate: { type: String, default: '0%' }
  },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('CardType', CardTypeSchema);
