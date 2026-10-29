const mongoose = require('mongoose');

const OtpTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ['signup', 'forgot_password'], required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OtpToken', OtpTokenSchema);

