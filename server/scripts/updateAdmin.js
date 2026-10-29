require('dotenv').config();
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akr_credit';

async function run() {
  await mongoose.connect(MONGO_URI);
  await AdminUser.updateOne({ email: 'admin@akr.com' }, { $set: { password: 'Admin@123' } });
  await AdminUser.updateOne({ email: 'staff@akr.com' }, { $set: { password: 'Staff@123' } });
  const admins = await AdminUser.find();
  console.log('MongoDB Admin users updated:', JSON.stringify(admins, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
