const mongoose = require('mongoose');

const PlanTypeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'SAREE_EMI' },
  icon: { type: String, default: 'shopping-bag' },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('PlanType', PlanTypeSchema);
