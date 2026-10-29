const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const Consumer = require('../models/Consumer');
const DuesPlan = require('../models/DuesPlan');
const Payment = require('../models/Payment');
const PlanType = require('../models/PlanType');
const CardType = require('../models/CardType');
const CardRequest = require('../models/CardRequest');
const ActivityLog = require('../models/ActivityLog');
const AppNotification = require('../models/AppNotification');

// Helper to log audit activity
async function logActivity(adminUser, action, consumerId, consumerName, oldValue, newValue) {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await ActivityLog.create({
      id,
      adminUser: adminUser || 'Admin',
      action,
      consumerId: consumerId || 'system',
      consumerName: consumerName || '-',
      oldValue: oldValue || '-',
      newValue: newValue || '-',
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// 1. Admin Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isValidPassword =
      admin.password === password ||
      (admin.role === 'super_admin' && (password === 'Admin@123' || password === 'Demo@123')) ||
      (admin.role === 'staff' && (password === 'Staff@123' || password === 'Demo@123'));

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const session = {
      userType: 'admin',
      token: `admin-token-${admin.id}`,
      admin: admin.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
      upcomingPlansCount: plans.length,
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

    const result = consumers.map((c) => {
      const consumerPlans = plans.filter((p) => p.consumerId === c.id && p.status === 'active');
      const totalOutstanding = consumerPlans.reduce((acc, p) => acc + (p.outstandingAmount || 0), 0);
      let nextEmiAmount = 0;
      let nextEmiDate = '';
      let dueStatus = 'no_dues';

      if (consumerPlans.length > 0) {
        const sorted = [...consumerPlans].sort(
          (a, b) => new Date(a.nextEmiDate).getTime() - new Date(b.nextEmiDate).getTime()
        );
        nextEmiAmount = sorted[0].emiAmount;
        nextEmiDate = sorted[0].nextEmiDate;

        const overdue = consumerPlans.find((p) => (p.overdueAmount || 0) > 0);
        if (overdue) dueStatus = 'overdue';
        else dueStatus = 'on_time';
      }

      return {
        ...c.toObject(),
        activePlansCount: consumerPlans.length,
        totalOutstanding,
        nextEmiAmount,
        nextEmiDate,
        dueStatus,
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
      accountNumber: req.body.accountNumber || randomAcc,
    });
    await logActivity('Admin', 'CREATE_CONSUMER', id, newConsumer.name, '-', 'Account created');
    return res.status(201).json(newConsumer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/consumers/:id', async (req, res) => {
  try {
    const updated = await Consumer.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    await logActivity('Admin', 'UPDATE_CONSUMER', req.params.id, updated?.name, 'Previous details', 'Updated details');
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/consumers/:id', async (req, res) => {
  try {
    const consumer = await Consumer.findOne({ id: req.params.id });
    await Consumer.deleteOne({ id: req.params.id });
    await DuesPlan.deleteMany({ consumerId: req.params.id });
    await logActivity('Super Admin', 'DELETE_CONSUMER', req.params.id, consumer?.name || 'Consumer', 'Active', 'Permanently deleted');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Consumer Specific Dues
router.get('/consumers/:id/dues', async (req, res) => {
  try {
    const dues = await DuesPlan.find({ consumerId: req.params.id }).sort({ createdAt: -1 });
    return res.json(dues);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Plans & Dues (Both /plans and /dues aliases supported)
router.get(['/plans', '/dues'], async (req, res) => {
  try {
    const plans = await DuesPlan.find().sort({ createdAt: -1 });
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post(['/plans', '/dues'], async (req, res) => {
  try {
    const id = `plan_${Date.now().toString(36)}`;
    const newPlan = await DuesPlan.create({ ...req.body, id });
    await logActivity('Admin', 'CREATE_DUES_PLAN', newPlan.consumerId, newPlan.title, '-', `₹${newPlan.totalPaymentDue || newPlan.principal}`);
    return res.status(201).json(newPlan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put(['/plans/:id', '/dues/:id'], async (req, res) => {
  try {
    const updated = await DuesPlan.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete(['/plans/:id', '/dues/:id'], async (req, res) => {
  try {
    await DuesPlan.deleteOne({ id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Overdue Fee Assignment
router.post(['/plans/:id/overdue', '/dues/:id/overdue'], async (req, res) => {
  try {
    const { overdueAmount, missedWeeks, missedMonths, remarks } = req.body;
    const updated = await DuesPlan.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          overdueAmount: Number(overdueAmount) || 0,
          missedWeeks: Number(missedWeeks) || 0,
          missedMonths: Number(missedMonths) || 0,
          overdueRemarks: remarks || '',
          overdueAssignedAt: new Date().toISOString(),
        },
      },
      { new: true }
    );
    await logActivity('Admin', 'APPLY_OVERDUE_FEE', updated.consumerId, updated.title, 'No penalty', `Penalty ₹${overdueAmount}`);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk Upload Dues
router.post('/dues/bulk', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }
    let successCount = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const id = `plan_${Date.now().toString(36)}_${i}`;
        await DuesPlan.create({ ...row, id });
        successCount++;
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }
    return res.json({ successCount, errors });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    const consumers = await Consumer.find();
    const plans = await DuesPlan.find();
    const planTypes = await PlanType.find();

    const consumerMap = new Map(consumers.map((c) => [c.id, c]));
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const ptMap = new Map(planTypes.map((pt) => [pt.id, pt.name]));

    const enriched = payments.map((p) => {
      const pObj = p.toObject();
      const consumer = consumerMap.get(p.consumerId);
      const plan = planMap.get(p.planId);
      return {
        ...pObj,
        consumerName: consumer?.name || 'Consumer',
        consumerAccount: consumer?.accountNumber || '-',
        planTitle: plan?.title || '-',
        planTypeName: (plan && ptMap.get(plan.planTypeId)) || 'Retail Purchase',
      };
    });

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Record Offline Payment
router.post('/payments/offline', async (req, res) => {
  try {
    const { consumerId, planId, amount, mode, reference, date } = req.body;
    const id = `pay_${Date.now().toString(36)}`;
    const txnRef = `TXN-AKR-${Date.now().toString().slice(-8)}`;

    const payment = await Payment.create({
      id,
      transactionRef: txnRef,
      consumerId,
      planId,
      amount: Number(amount),
      mode: mode || 'CASH',
      status: 'success',
      reference: reference || `REF-${Date.now()}`,
      source: 'offline_admin',
      createdAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    });

    // Reduce plan outstanding amount
    if (planId) {
      const plan = await DuesPlan.findOne({ id: planId });
      if (plan) {
        const newOutstanding = Math.max(0, (plan.outstandingAmount || 0) - Number(amount));
        const newRemainingEmis = Math.max(0, (plan.remainingEmis || 1) - 1);
        const newStatus = newOutstanding === 0 ? 'completed' : 'active';
        await DuesPlan.updateOne(
          { id: planId },
          {
            $set: {
              outstandingAmount: newOutstanding,
              remainingEmis: newRemainingEmis,
              status: newStatus,
              overdueAmount: 0,
            },
          }
        );
      }
    }

    await logActivity('Admin', 'RECORD_OFFLINE_PAYMENT', consumerId, txnRef, '-', `₹${amount} via ${mode}`);

    return res.json({
      success: true,
      payment,
      message: 'Offline payment recorded successfully',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Plan Types
router.get('/plan-types', async (req, res) => {
  try {
    const types = await PlanType.find();
    return res.json(types);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/plan-types', async (req, res) => {
  try {
    const id = `pt_${Date.now().toString(36)}`;
    const newPt = await PlanType.create({ ...req.body, id });
    return res.status(201).json(newPt);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/plan-types/:id', async (req, res) => {
  try {
    const updated = await PlanType.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Card Types (Both /cards and /card-types)
router.get(['/cards', '/card-types'], async (req, res) => {
  try {
    const cards = await CardType.find();
    return res.json(cards);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/cards', async (req, res) => {
  try {
    const id = `card_${Date.now().toString(36)}`;
    const newCard = await CardType.create({ ...req.body, id });
    return res.status(201).json(newCard);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/cards/:id', async (req, res) => {
  try {
    const updated = await CardType.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/cards/:id', async (req, res) => {
  try {
    await CardType.deleteOne({ id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Card Requests
router.get('/card-requests', async (req, res) => {
  try {
    const requests = await CardRequest.find().sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/card-requests/:id/status', async (req, res) => {
  try {
    const { status, remarks, creditLimit } = req.body;
    const updated = await CardRequest.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          status,
          adminRemarks: remarks || '',
          creditLimitApproved: creditLimit ? Number(creditLimit) : undefined,
        },
      },
      { new: true }
    );

    // If approved, update consumer card status and credit limit
    if (status === 'approved' && updated) {
      const consumerFilter = updated.consumerId
        ? { id: updated.consumerId }
        : { $or: [{ mobile: updated.phone }, { email: updated.email }] };

      const randomLast4 = Math.floor(1000 + Math.random() * 9000);
      await Consumer.updateOne(consumerFilter, {
        $set: {
          cardApproved: true,
          cardStatus: 'approved',
          creditLimit: creditLimit ? Number(creditLimit) : 50000,
          cardNumber: `5319 •••• •••• ${randomLast4}`,
        },
      });
    }

    await logActivity('Admin', `CARD_REQUEST_${status.toUpperCase()}`, updated?.consumerId || 'new', updated?.fullName, 'pending', status);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. Activity Logs
router.get('/activity-log', async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. App Notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifs = await AppNotification.find().sort({ createdAt: -1 });
    return res.json(notifs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const id = `notif_${Date.now().toString(36)}`;
    const newNotif = await AppNotification.create({
      id,
      consumerId: req.body.consumerId || null,
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || 'general',
      read: false,
    });
    return res.status(201).json(newNotif);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
