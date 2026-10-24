const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const Consumer = require('../models/Consumer');
const DuesPlan = require('../models/DuesPlan');
const Payment = require('../models/Payment');
const PlanType = require('../models/PlanType');
const CardType = require('../models/CardType');

// 1. Admin Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const session = {
      userType: 'admin',
      token: `admin-token-${admin.id}`,
      admin: admin.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Admin Dashboard Metrics
router.get('/dashboard', async (req, res) => {
  try {
    const totalConsumers = await Consumer.countDocuments();
    const activeConsumers = await Consumer.countDocuments({ status: 'active' });
    const plans = await DuesPlan.find({ status: 'active' });
    const payments = await Payment.find({ status: 'success' });

    const totalOutstanding = plans.reduce((acc, p) => acc + (p.outstandingAmount || 0), 0);
    const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    return res.json({
      totalConsumers,
      activeConsumers,
      totalOutstanding,
      totalCollected,
      upcomingPlansCount: plans.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Consumers List with Dues Calculations
router.get('/consumers', async (req, res) => {
  try {
    const consumers = await Consumer.find().sort({ createdAt: -1 });
    const plans = await DuesPlan.find();

    const result = consumers.map(c => {
      const consumerPlans = plans.filter(p => p.consumerId === c.id && p.status === 'active');
      const totalOutstanding = consumerPlans.reduce((acc, p) => acc + (p.outstandingAmount || 0), 0);
      let nextEmiAmount = 0;
      let nextEmiDate = '';
      let dueStatus = 'no_dues';

      if (consumerPlans.length > 0) {
        const sorted = [...consumerPlans].sort((a, b) => new Date(a.nextEmiDate).getTime() - new Date(b.nextEmiDate).getTime());
        nextEmiAmount = sorted[0].emiAmount;
        nextEmiDate = sorted[0].nextEmiDate;

        const overdue = consumerPlans.find(p => (p.overdueAmount || 0) > 0);
        if (overdue) dueStatus = 'overdue';
        else dueStatus = 'on_time';
      }

      return {
        ...c.toObject(),
        activePlansCount: consumerPlans.length,
        totalOutstanding,
        nextEmiAmount,
        nextEmiDate,
        dueStatus
      };
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Create / Update / Delete Consumer
router.post('/consumers', async (req, res) => {
  try {
    const id = `c_${Date.now().toString(36)}`;
    const randomAcc = `AKR1000${Math.floor(1000 + Math.random() * 9000)}`;
    const newConsumer = await Consumer.create({
      ...req.body,
      id,
      accountNumber: req.body.accountNumber || randomAcc
    });
    return res.status(201).json(newConsumer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/consumers/:id', async (req, res) => {
  try {
    const updated = await Consumer.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/consumers/:id', async (req, res) => {
  try {
    await Consumer.deleteOne({ id: req.params.id });
    await DuesPlan.deleteMany({ consumerId: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Plans & Dues
router.get('/plans', async (req, res) => {
  const plans = await DuesPlan.find().sort({ createdAt: -1 });
  return res.json(plans);
});

router.post('/plans', async (req, res) => {
  try {
    const id = `plan_${Date.now().toString(36)}`;
    const newPlan = await DuesPlan.create({ ...req.body, id });
    return res.status(201).json(newPlan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const updated = await DuesPlan.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Payments
router.get('/payments', async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  return res.json(payments);
});

// 7. Plan Types & Card Types
router.get('/plan-types', async (req, res) => {
  const types = await PlanType.find();
  return res.json(types);
});

router.get('/card-types', async (req, res) => {
  const cards = await CardType.find();
  return res.json(cards);
});

module.exports = router;
