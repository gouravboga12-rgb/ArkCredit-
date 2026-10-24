const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const DuesPlan = require('../models/DuesPlan');
const Payment = require('../models/Payment');
const CardType = require('../models/CardType');
const AppNotification = require('../models/AppNotification');

// Auth helper middleware
function getConsumerId(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  // Token format: "jwt-token-{consumerId}"
  if (token.startsWith('jwt-token-')) {
    return token.replace('jwt-token-', '');
  }
  return token;
}

// 1. Consumer Login
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const consumer = await Consumer.findOne({
      $or: [
        { email: cleanId },
        { mobile: identifier.trim() },
        { accountNumber: identifier.trim() },
        { id: identifier.trim() }
      ]
    });

    if (!consumer || consumer.passwordHash !== password) {
      return res.status(401).json({ error: 'Invalid mobile, account number, or password' });
    }

    if (consumer.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Contact support.' });
    }

    const session = {
      userType: 'consumer',
      token: `jwt-token-${consumer.id}`,
      consumer: consumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Consumer Signup
router.post('/auth/signup', async (req, res) => {
  try {
    const { fullName, mobile, email, password, address } = req.body;
    if (!fullName || !mobile || !email || !password) {
      return res.status(400).json({ error: 'Full name, mobile, email, and password are required' });
    }

    const existing = await Consumer.findOne({ $or: [{ email: email.toLowerCase() }, { mobile: mobile.trim() }] });
    if (existing) {
      return res.status(409).json({ error: 'An account with this mobile or email already exists' });
    }

    const id = `c_${Date.now().toString(36)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `AKR1000${randomSuffix}`;

    const newConsumer = await Consumer.create({
      id,
      name: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      address: address || '',
      accountNumber,
      passwordHash: password,
      status: 'active',
      cardApproved: false,
      creditLimit: 0,
      cardStatus: 'not_applied'
    });

    const session = {
      userType: 'consumer',
      token: `jwt-token-${newConsumer.id}`,
      consumer: newConsumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Password reset flows
router.post('/auth/forgot-password', async (req, res) => {
  return res.json({ message: 'OTP sent to registered mobile/email (Use 123456 for test verification)' });
});

router.post('/auth/verify-otp', async (req, res) => {
  const { otp } = req.body;
  if (otp === '123456' || otp === '000000') {
    return res.json({ valid: true });
  }
  return res.status(400).json({ valid: false, error: 'Invalid verification code' });
});

router.post('/auth/reset-password', async (req, res) => {
  const { identifier, newPassword } = req.body;
  if (!identifier || !newPassword) {
    return res.status(400).json({ error: 'Identifier and new password required' });
  }
  await Consumer.updateOne(
    { $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }] },
    { $set: { passwordHash: newPassword } }
  );
  return res.json({ success: true, message: 'Password reset successful' });
});

// 4. Consumer Profile
router.get('/profile', async (req, res) => {
  const consumerId = getConsumerId(req);
  if (!consumerId) return res.status(401).json({ error: 'Unauthorized' });

  const consumer = await Consumer.findOne({ id: consumerId });
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  return res.json(consumer);
});

router.put('/profile', async (req, res) => {
  const consumerId = getConsumerId(req);
  if (!consumerId) return res.status(401).json({ error: 'Unauthorized' });

  const updated = await Consumer.findOneAndUpdate({ id: consumerId }, { $set: req.body }, { new: true });
  return res.json(updated);
});

// 5. Consumer Dues & EMIs
router.get('/dues', async (req, res) => {
  const consumerId = getConsumerId(req);
  if (!consumerId) return res.status(401).json({ error: 'Unauthorized' });

  const plans = await DuesPlan.find({ consumerId, status: 'active' });
  const allPlans = await DuesPlan.find({ consumerId });

  let totalOutstanding = 0;
  let nextEmiAmount = 0;
  let nextEmiDate = '';
  let dueStatus = 'no_dues';

  if (plans.length > 0) {
    totalOutstanding = plans.reduce((acc, p) => acc + (p.outstandingAmount || 0), 0);
    const sortedByDate = [...plans].sort((a, b) => new Date(a.nextEmiDate).getTime() - new Date(b.nextEmiDate).getTime());
    nextEmiAmount = sortedByDate[0].emiAmount;
    nextEmiDate = sortedByDate[0].nextEmiDate;

    const overdue = plans.find(p => (p.overdueAmount || 0) > 0);
    if (overdue) {
      dueStatus = 'overdue';
    } else {
      const now = new Date();
      const emiDate = new Date(nextEmiDate);
      const diffDays = Math.ceil((emiDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      dueStatus = diffDays <= 3 ? 'due_soon' : 'on_time';
    }
  }

  return res.json({
    totalOutstanding,
    nextEmiAmount,
    nextEmiDate,
    isDueSoon: dueStatus === 'due_soon',
    dueStatus,
    plans,
    allPlans
  });
});

// 6. Payment initiation
router.post('/payments/initiate', async (req, res) => {
  try {
    const consumerId = getConsumerId(req);
    if (!consumerId) return res.status(401).json({ error: 'Unauthorized' });

    const { planId, amount, mode } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const txnRef = `TXN-AKR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
      id: `pay_${Date.now().toString(36)}`,
      transactionRef: txnRef,
      consumerId,
      planId: planId || 'plan_all',
      amount,
      mode: mode || 'UPI',
      status: 'success',
      reference: `UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      source: 'online'
    });

    // Reduce plan outstanding if specific plan
    if (planId && planId !== 'all') {
      const plan = await DuesPlan.findOne({ id: planId, consumerId });
      if (plan) {
        plan.outstandingAmount = Math.max(0, plan.outstandingAmount - amount);
        plan.remainingEmis = Math.max(0, plan.remainingEmis - 1);
        if (plan.outstandingAmount === 0) {
          plan.status = 'completed';
        }
        await plan.save();
      }
    }

    return res.json({
      success: true,
      transactionRef: txnRef,
      paymentId: payment.id,
      amount,
      mode,
      paidAt: payment.createdAt,
      message: 'Payment received successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Payment history
router.get('/payments', async (req, res) => {
  const consumerId = getConsumerId(req);
  if (!consumerId) return res.status(401).json({ error: 'Unauthorized' });

  const payments = await Payment.find({ consumerId }).sort({ createdAt: -1 });
  return res.json(payments);
});

// 8. Cards & Notifications
router.get('/cards', async (req, res) => {
  const cards = await CardType.find({ enabled: true });
  return res.json(cards);
});

router.get('/notifications', async (req, res) => {
  const consumerId = getConsumerId(req);
  const notifications = await AppNotification.find({
    $or: [{ consumerId: null }, { consumerId }]
  }).sort({ createdAt: -1 });
  return res.json(notifications);
});

router.put('/notifications/:id/read', async (req, res) => {
  await AppNotification.updateOne({ id: req.params.id }, { $set: { read: true } });
  return res.json({ success: true });
});

router.put('/notifications/read-all', async (req, res) => {
  const consumerId = getConsumerId(req);
  await AppNotification.updateMany({ $or: [{ consumerId: null }, { consumerId }] }, { $set: { read: true } });
  return res.json({ success: true });
});

module.exports = router;
