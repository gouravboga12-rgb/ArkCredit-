require('dotenv').config();
const mongoose = require('mongoose');

const Consumer = require('../models/Consumer');
const AdminUser = require('../models/AdminUser');
const DuesPlan = require('../models/DuesPlan');
const Payment = require('../models/Payment');
const CardType = require('../models/CardType');
const PlanType = require('../models/PlanType');
const AppNotification = require('../models/AppNotification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akr_credit';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB. Starting database seed...');

  // 1. Plan Types
  await PlanType.deleteMany({});
  await PlanType.insertMany([
    { id: 'pt_saree_bridal', name: 'Bridal & Silk Sarees', category: 'SAREE_EMI', icon: 'shopping-bag', enabled: true },
    { id: 'pt_handloom_wear', name: 'Handloom & Designer Wear', category: 'PRODUCT_PURCHASE', icon: 'sparkles', enabled: true },
    { id: 'pt_jewellery', name: 'Jewellery & Accessories', category: 'RETAIL_PURCHASE', icon: 'wallet', enabled: true },
    { id: 'pt_custom_store', name: 'Store Retail Purchase', category: 'CUSTOM_STORE', icon: 'shopping-bag', enabled: true },
  ]);
  console.log('Seeded Plan Types');

  // 2. Card Types
  await CardType.deleteMany({});
  await CardType.insertMany([
    {
      id: 'card_emi_privilege',
      name: 'AKR EMI Privilege Card',
      imageUrl: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?auto=format&fit=crop&w=600&q=80',
      features: [
        'Flexible Limit: Up to ₹50,000 / ₹1,00,000',
        '0% Interest on Select Partner EMIs',
        'Instant Online Approval & Verification',
        'Convenient Weekly EMI Schedule',
      ],
      benefits: [
        'Pre-approved credit limit range customized to your profile',
        'Instant conversion of saree & retail purchases into weekly 0% interest EMIs',
        'Transparent tracking of used amount, available balance, and weekly schedule',
        'Zero annual maintenance fee & zero hidden charges',
      ],
      charges: { joiningFee: 0, annualFee: 0, interestRate: '0% Interest-Free on-time' },
      enabled: true,
    }
  ]);
  console.log('Seeded Card Types');

  // 3. Admin Users
  await AdminUser.deleteMany({});
  await AdminUser.insertMany([
    { id: 'admin_super', name: 'Rajesh Varma', email: 'admin@akr.com', role: 'super_admin', password: 'Demo@123' },
    { id: 'admin_staff', name: 'Pooja Mehta', email: 'staff@akr.com', role: 'staff', password: 'Demo@123' },
  ]);
  console.log('Seeded Admin Users');

  // 4. Consumers
  await Consumer.deleteMany({});
  await Consumer.insertMany([
    {
      id: 'c_rahul_4821',
      name: 'Rahul Sharma',
      mobile: '9876543210',
      email: 'rahul@example.com',
      address: '42, Prestige Palms, Indiranagar, Bengaluru, Karnataka 560038',
      accountNumber: 'AKR10004821',
      status: 'active',
      passwordHash: 'Demo@123',
      cardApproved: true,
      creditLimit: 30000,
      cardStatus: 'approved',
      cardNumber: '5123 •••• •••• 4821',
      createdAt: new Date('2025-03-10T10:00:00.000Z')
    },
    {
      id: 'c_priya_5512',
      name: 'Priya Nair',
      mobile: '9845012345',
      email: 'priya.nair@example.com',
      address: 'Flat 302, Green Glen Layout, Bellandur, Bengaluru 560103',
      accountNumber: 'AKR10005512',
      status: 'active',
      passwordHash: 'Demo@123',
      cardApproved: true,
      creditLimit: 300000,
      cardStatus: 'approved',
      cardNumber: '5241 •••• •••• 7492',
      createdAt: new Date('2025-03-15T11:00:00.000Z')
    },
    {
      id: 'c_amit_9823',
      name: 'Amit Patel',
      mobile: '9820011223',
      email: 'amit.patel@example.com',
      address: 'B-14, Shivalik Residency, Satellite, Ahmedabad 380015',
      accountNumber: 'AKR10009823',
      status: 'active',
      passwordHash: 'Demo@123',
      cardApproved: true,
      creditLimit: 100000,
      cardStatus: 'approved',
      cardNumber: '5319 •••• •••• 6105',
      createdAt: new Date('2025-03-18T12:00:00.000Z')
    }
  ]);
  console.log('Seeded Consumers');

  // 5. Dues Plans
  await DuesPlan.deleteMany({});
  await DuesPlan.insertMany([
    {
      id: 'plan_priya_1',
      consumerId: 'c_priya_5512',
      planTypeId: 'pt_saree_bridal',
      title: 'Paithani Pure Silk Handloom Saree',
      productName: 'Traditional Yeola Paithani Pure Silk Saree with Peacock Border',
      referenceNumber: 'SAR-2026-1192',
      status: 'active',
      outstandingAmount: 12500,
      totalPaymentDue: 30000,
      principal: 12500,
      interest: 0,
      processingFee: 0,
      emiAmount: 2500,
      nextEmiDate: '2026-10-28',
      totalEmis: 12,
      remainingEmis: 5,
      tenureWeeks: 12,
      frequency: 'weekly',
      linkedCardTypeId: 'card_emi_privilege',
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
    },
    {
      id: 'plan_amit_1',
      consumerId: 'c_amit_9823',
      planTypeId: 'pt_saree_bridal',
      title: 'Kanchipuram Silk Bridal Saree',
      productName: 'Kanchipuram Heavy Zari Bridal Silk Saree - Crimson Red',
      referenceNumber: 'SAR-2026-8821',
      status: 'active',
      outstandingAmount: 14000,
      totalPaymentDue: 25200,
      principal: 14000,
      interest: 0,
      processingFee: 0,
      emiAmount: 1400,
      nextEmiDate: '2026-10-12',
      totalEmis: 18,
      remainingEmis: 10,
      tenureWeeks: 18,
      frequency: 'weekly',
      linkedCardTypeId: 'card_emi_privilege',
      overdueAmount: 250,
      missedWeeks: 1,
      missedMonths: 1,
      overdueRemarks: 'Past due by 7 days (1 missed weekly payment). Administrative penalty applied.',
      overdueAssignedAt: '2026-10-14T10:00:00.000Z',
      createdAt: '2026-06-10T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
    }
  ]);
  console.log('Seeded Dues Plans');

  // 6. Payments
  await Payment.deleteMany({});
  await Payment.insertMany([
    {
      id: 'pay_priya_1',
      transactionRef: 'TXN-AKR-20260920-8812',
      consumerId: 'c_priya_5512',
      planId: 'plan_priya_1',
      planTypeId: 'pt_saree_bridal',
      amount: 2500,
      mode: 'UPI',
      status: 'success',
      reference: 'UPI/226301948211',
      source: 'online',
      createdAt: '2026-09-20T11:15:00.000Z'
    }
  ]);
  console.log('Seeded Payments');

  // 7. Notifications
  await AppNotification.deleteMany({});
  await AppNotification.insertMany([
    {
      id: 'notif_welcome',
      consumerId: null,
      title: 'Welcome to AKR Credit Capital',
      message: 'Apply for the AKR EMI Privilege Card to enjoy 0% interest on silk sarees, bridal wear, and store purchases.',
      type: 'general',
      read: false,
      createdAt: new Date().toISOString()
    }
  ]);
  console.log('Seeded Notifications');

  console.log('Database seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
