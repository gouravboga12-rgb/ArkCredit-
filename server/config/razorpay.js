const https = require('https');
const crypto = require('crypto');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_Tut4fI6v9dhbjs';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'EdU08QaNxgd3IvI1eboBnw1v';

/**
 * Create an order on Razorpay
 * @param {Object} opts - { amount (in rupees), currency, receipt, notes }
 * @returns {Promise<Object>}
 */
function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  return new Promise((resolve, reject) => {
    const amountInPaise = Math.round(Number(amount) * 100);
    const postData = JSON.stringify({
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${Date.now().toString(36)}`,
      notes,
    });

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error?.description || 'Razorpay order creation failed'));
          }
        } catch (e) {
          reject(new Error(`Razorpay response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Verify Razorpay payment signature
 * @param {Object} opts - { orderId, paymentId, signature }
 * @returns {boolean}
 */
function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expectedSignature === signature;
}

module.exports = {
  RAZORPAY_KEY_ID,
  createRazorpayOrder,
  verifyRazorpaySignature,
};

