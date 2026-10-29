const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const Consumer = require('../models/Consumer');
const OtpToken = require('../models/OtpToken');
const DuesPlan = require('../models/DuesPlan');
const Payment = require('../models/Payment');
const CardType = require('../models/CardType');
const AppNotification = require('../models/AppNotification');
const { generateOtp, sendOtpEmail } = require('../config/mailer');

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${'*'.repeat(Math.max(user.length - 2, 3))}${user[user.length - 1]}@${domain}`;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

async function verifyGooglePayload({ credential, accessToken }) {
  if (credential) {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google ID token payload');
    }
    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || '',
      emailVerified: Boolean(payload.email_verified),
    };
  }

  if (accessToken) {
    const tokenInfo = await googleClient.getTokenInfo(accessToken);
    if (tokenInfo.aud && tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth token client ID mismatch');
    }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      throw new Error('Failed to fetch Google user profile');
    }
    const profile = await userRes.json();
    const email = (profile.email || tokenInfo.email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('Google account did not return an email address');
    }
    return {
      googleId: profile.sub || tokenInfo.sub,
      email,
      name: profile.name || email.split('@')[0],
      avatarUrl: profile.picture || '',
      emailVerified: Boolean(profile.email_verified),
    };
  }

  throw new Error('Google credential or accessToken is required');
}

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

// 2. Consumer Signup - Step 1: Send Registration OTP to Email
router.post('/auth/signup/send-otp', async (req, res) => {
  try {
    const { fullName, mobile, email } = req.body;
    if (!fullName || !mobile || !email) {
      return res.status(400).json({ error: 'Full name, mobile number, and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const existing = await Consumer.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });
    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(409).json({ error: 'An account with this mobile number already exists.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpToken.deleteMany({ email: cleanEmail, purpose: 'signup' });
    await OtpToken.create({
      email: cleanEmail,
      otp,
      purpose: 'signup',
      expiresAt,
    });

    try {
      await sendOtpEmail({
        to: cleanEmail,
        otp,
        purpose: 'signup',
        name: fullName.trim(),
      });
    } catch (mailErr) {
      console.error('SMTP Email sending error:', mailErr);
      return res.status(500).json({
        error: `Failed to deliver verification email to ${cleanEmail}. Please check your email address.`,
      });
    }

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      expiresInMinutes: 10,
    });
  } catch (err) {
    console.error('Sign-up send-otp error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send verification code' });
  }
});

// 2b. Consumer Signup - Step 2: Verify OTP and Create Account
router.post('/auth/signup/verify', async (req, res) => {
  try {
    const { fullName, mobile, email, password, address, otp } = req.body;
    if (!fullName || !mobile || !email || !password || !otp) {
      return res.status(400).json({ error: 'Full name, mobile, email, password, and OTP are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const tokenDoc = await OtpToken.findOne({
      email: cleanEmail,
      otp: otp.trim(),
      purpose: 'signup',
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    const existing = await Consumer.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this mobile or email already exists' });
    }

    const id = `c_${Date.now().toString(36)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `AKR1000${randomSuffix}`;

    const newConsumer = await Consumer.create({
      id,
      name: fullName.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      address: address || '',
      accountNumber,
      passwordHash: password,
      status: 'active',
      cardApproved: false,
      creditLimit: 0,
      cardStatus: 'not_applied',
    });

    // Remove consumed OTP
    await OtpToken.deleteMany({ email: cleanEmail, purpose: 'signup' });

    const session = {
      userType: 'consumer',
      token: `jwt-token-${newConsumer.id}`,
      consumer: newConsumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    return res.status(201).json(session);
  } catch (err) {
    console.error('Sign-up verify error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Backward-compatible direct signup route (handles optional otp)
router.post('/auth/signup', async (req, res) => {
  try {
    const { fullName, mobile, email, password, address, otp } = req.body;
    if (!fullName || !mobile || !email || !password) {
      return res.status(400).json({ error: 'Full name, mobile, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    if (otp) {
      const tokenDoc = await OtpToken.findOne({
        email: cleanEmail,
        otp: otp.trim(),
        purpose: 'signup',
        expiresAt: { $gt: new Date() },
      });
      if (!tokenDoc) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }
    }

    const existing = await Consumer.findOne({ $or: [{ email: cleanEmail }, { mobile: cleanMobile }] });
    if (existing) {
      return res.status(409).json({ error: 'An account with this mobile or email already exists' });
    }

    const id = `c_${Date.now().toString(36)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `AKR1000${randomSuffix}`;

    const newConsumer = await Consumer.create({
      id,
      name: fullName.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      address: address || '',
      accountNumber,
      passwordHash: password,
      status: 'active',
      cardApproved: false,
      creditLimit: 0,
      cardStatus: 'not_applied',
    });

    await OtpToken.deleteMany({ email: cleanEmail, purpose: 'signup' });

    const session = {
      userType: 'consumer',
      token: `jwt-token-${newConsumer.id}`,
      consumer: newConsumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2a. Consumer Login with Google (Registered Accounts ONLY)
const handleGoogleLogin = async (req, res) => {
  try {
    const { credential, accessToken } = req.body || {};
    const googleProfile = await verifyGooglePayload({ credential, accessToken });

    const consumer = await Consumer.findOne({
      $or: [
        { email: googleProfile.email },
        ...(googleProfile.googleId ? [{ googleId: googleProfile.googleId }] : []),
      ],
    });

    if (!consumer) {
      return res.status(404).json({
        error: 'No account found with this Google email. Please sign up first.',
        code: 'ACCOUNT_NOT_FOUND',
        googleProfile,
      });
    }

    if (consumer.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Contact support.' });
    }

    // Link googleId / avatarUrl if not already saved
    let updated = false;
    if (googleProfile.googleId && !consumer.googleId) {
      consumer.googleId = googleProfile.googleId;
      updated = true;
    }
    if (googleProfile.avatarUrl && !consumer.avatarUrl) {
      consumer.avatarUrl = googleProfile.avatarUrl;
      updated = true;
    }
    if (updated) {
      consumer.updatedAt = new Date();
      await consumer.save();
    }

    const session = {
      userType: 'consumer',
      token: `jwt-token-${consumer.id}`,
      consumer: consumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    return res.json(session);
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Google authentication failed' });
  }
};

router.post('/auth/google', handleGoogleLogin);
router.post('/auth/google/login', handleGoogleLogin);

// 2b. Consumer Sign Up with Google - Step 1: Check if email is new or already registered
router.post('/auth/google/check', async (req, res) => {
  try {
    const { credential, accessToken } = req.body || {};
    const googleProfile = await verifyGooglePayload({ credential, accessToken });

    const existing = await Consumer.findOne({
      $or: [
        { email: googleProfile.email },
        ...(googleProfile.googleId ? [{ googleId: googleProfile.googleId }] : []),
      ],
    });

    if (existing) {
      return res.json({
        isNewUser: false,
        exists: true,
        message: 'An account with this Google email is already registered. Please log in with Google.',
        googleProfile,
      });
    }

    return res.json({
      isNewUser: true,
      exists: false,
      googleProfile,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Failed to verify Google account' });
  }
});

// 2c. Consumer Sign Up with Google - Step 2: Complete registration with basic details
router.post('/auth/google/register', async (req, res) => {
  try {
    const { credential, accessToken, fullName, mobile, email, password, address } = req.body || {};

    // Re-verify Google token to ensure authenticity
    const googleProfile = await verifyGooglePayload({ credential, accessToken });

    const finalName = (fullName || googleProfile.name || '').trim();
    const finalMobile = (mobile || '').trim();
    const finalEmail = googleProfile.email; // Enforced from verified Google profile
    const finalPassword = password || `Google@${googleProfile.googleId.slice(-6)}`;

    if (!finalName || !finalMobile || !finalEmail || !password) {
      return res.status(400).json({ error: 'Full name, 10-digit mobile number, email, and password are required' });
    }

    if (email && email.trim().toLowerCase() !== finalEmail) {
      return res.status(400).json({ error: 'Email does not match the verified Google account' });
    }

    const existing = await Consumer.findOne({
      $or: [
        { email: finalEmail },
        { mobile: finalMobile },
        ...(googleProfile.googleId ? [{ googleId: googleProfile.googleId }] : []),
      ],
    });

    if (existing) {
      if (existing.email === finalEmail || (googleProfile.googleId && existing.googleId === googleProfile.googleId)) {
        return res.status(409).json({ error: 'An account with this Google email already exists. Please log in.' });
      }
      return res.status(409).json({ error: 'An account with this mobile number already exists.' });
    }

    const id = `c_${Date.now().toString(36)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `AKR1000${randomSuffix}`;

    const newConsumer = await Consumer.create({
      id,
      name: finalName,
      mobile: finalMobile,
      email: finalEmail,
      address: address || '',
      accountNumber,
      googleId: googleProfile.googleId,
      avatarUrl: googleProfile.avatarUrl || '',
      passwordHash: finalPassword,
      status: 'active',
      cardApproved: false,
      creditLimit: 0,
      cardStatus: 'not_applied',
    });

    const session = {
      userType: 'consumer',
      token: `jwt-token-${newConsumer.id}`,
      consumer: newConsumer.toObject(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Google registration failed' });
  }
});

// 3. Password reset flows (Real SMTP Email Delivery via creditsupportakr@gmail.com)
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email, mobile number, or account ID is required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const consumer = await Consumer.findOne({
      $or: [
        { email: cleanId },
        { mobile: identifier.trim() },
        { accountNumber: identifier.trim() },
        { id: identifier.trim() },
      ],
    });

    if (!consumer) {
      return res.status(404).json({ error: 'No account found matching this identifier' });
    }

    if (!consumer.email) {
      return res.status(400).json({ error: 'No email address registered for this account. Please contact support.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpToken.deleteMany({ email: consumer.email.toLowerCase(), purpose: 'forgot_password' });
    await OtpToken.create({
      email: consumer.email.toLowerCase(),
      otp,
      purpose: 'forgot_password',
      expiresAt,
    });

    try {
      await sendOtpEmail({
        to: consumer.email,
        otp,
        purpose: 'forgot_password',
        name: consumer.name || 'Customer',
      });
    } catch (mailErr) {
      console.error('SMTP Password Reset delivery error:', mailErr);
      return res.status(500).json({
        error: `Failed to deliver verification code to ${maskEmail(consumer.email)}. Please try again later.`,
      });
    }

    return res.json({
      success: true,
      message: `Verification code sent to registered email ${maskEmail(consumer.email)}`,
      emailMasked: maskEmail(consumer.email),
      email: consumer.email,
      expiresInMinutes: 10,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send password reset code' });
  }
});

router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { identifier, otp, purpose = 'forgot_password' } = req.body;
    if (!otp) {
      return res.status(400).json({ valid: false, error: 'Verification code is required' });
    }

    let targetEmail = '';
    if (identifier) {
      const cleanId = identifier.trim().toLowerCase();
      const consumer = await Consumer.findOne({
        $or: [
          { email: cleanId },
          { mobile: identifier.trim() },
          { accountNumber: identifier.trim() },
          { id: identifier.trim() },
        ],
      });
      targetEmail = consumer ? consumer.email.toLowerCase() : cleanId;
    }

    const query = {
      otp: otp.trim(),
      purpose,
      expiresAt: { $gt: new Date() },
    };
    if (targetEmail) {
      query.email = targetEmail;
    }

    const tokenDoc = await OtpToken.findOne(query);

    if (!tokenDoc) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired verification code' });
    }

    tokenDoc.verified = true;
    await tokenDoc.save();

    return res.json({ valid: true, message: 'Code verified successfully' });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { identifier, newPassword, otp } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({ error: 'Identifier and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const consumer = await Consumer.findOne({
      $or: [
        { email: cleanId },
        { mobile: identifier.trim() },
        { accountNumber: identifier.trim() },
        { id: identifier.trim() },
      ],
    });

    if (!consumer) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    // Verify OTP was validated or validate it now
    const query = {
      email: consumer.email.toLowerCase(),
      purpose: 'forgot_password',
    };
    if (otp) {
      query.otp = otp.trim();
    } else {
      query.verified = true;
    }

    const tokenDoc = await OtpToken.findOne(query);

    if (!tokenDoc) {
      return res.status(400).json({ error: 'Please verify the OTP code first' });
    }

    consumer.passwordHash = newPassword;
    consumer.updatedAt = new Date();
    await consumer.save();

    // Clean up OTPs
    await OtpToken.deleteMany({ email: consumer.email.toLowerCase(), purpose: 'forgot_password' });

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
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
