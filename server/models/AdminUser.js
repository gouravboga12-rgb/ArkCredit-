const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['super_admin', 'staff', 'manager'], default: 'staff' },
  password: { type: String, default: 'Admin@123' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminUser', AdminUserSchema);
