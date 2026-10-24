const mongoose = require('mongoose');

const AppNotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  consumerId: { type: String, default: null }, // null = broadcast
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('AppNotification', AppNotificationSchema);
