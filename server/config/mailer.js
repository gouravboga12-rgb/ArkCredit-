const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'creditsupportakr@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'AKR CREDIT CAPITAL <creditsupportakr@gmail.com>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail({ to, otp, purpose = 'signup', name = 'Customer' }) {
  const isSignUp = purpose === 'signup';
  const subject = isSignUp
    ? `[AKR CREDIT CAPITAL] Verification Code: ${otp} for Registration`
    : `[AKR CREDIT CAPITAL] Verification Code: ${otp} for Password Reset`;

  const headerTitle = isSignUp ? 'Welcome to AKR Credit Capital' : 'Password Reset Request';
  const messageBody = isSignUp
    ? 'Thank you for choosing AKR Credit Capital. Please use the following 6-digit verification code to complete your account registration.'
    : 'We received a request to reset your AKR Credit Capital account password. Please use the following 6-digit verification code to proceed.';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0b0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0e; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #141419; border: 1px solid #2a2a32; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
                
                <!-- Gold Accent Header Bar -->
                <tr>
                  <td height="5" style="background: linear-gradient(90deg, #b8860b, #ffd700, #b8860b);"></td>
                </tr>

                <!-- Brand Title -->
                <tr>
                  <td align="center" style="padding: 32px 24px 16px 24px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #d4af37; text-transform: uppercase;">
                      AKR CREDIT CAPITAL
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 1px; color: #8e8e93; text-transform: uppercase;">
                      Building Possibilities Together
                    </p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 16px 32px;">
                    <div style="background-color: #1a1a22; border: 1px solid #2d2d38; border-radius: 12px; padding: 24px;">
                      <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 600; color: #ffffff;">
                        ${headerTitle}
                      </h2>
                      <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #b3b3b3;">
                        Hello <strong>${name}</strong>,
                      </p>
                      <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #b3b3b3;">
                        ${messageBody}
                      </p>

                      <!-- OTP Box -->
                      <div style="text-align: center; margin: 24px 0; padding: 18px; background: #0c0c10; border: 1px dashed #d4af37; border-radius: 10px;">
                        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8e8e93; margin-bottom: 6px;">
                          Your 6-Digit Verification Code
                        </span>
                        <span style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #ffd700;">
                          ${otp}
                        </span>
                      </div>

                      <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5; color: #8e8e93; text-align: center;">
                        ⏱️ This verification code is valid for <strong>10 minutes</strong>.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Security Advisory -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #707078; text-align: center;">
                      Security Warning: Never share this OTP with anyone, including AKR Credit Capital representatives. If you did not initiate this request, please contact our support desk immediately at <a href="mailto:creditsupportakr@gmail.com" style="color: #d4af37; text-decoration: none;">creditsupportakr@gmail.com</a>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0d0d11; padding: 20px; border-top: 1px solid #22222b; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #5a5a62;">
                      © 2026 AKR CREDIT CAPITAL. All rights reserved.
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #404048;">
                      Official Support: creditsupportakr@gmail.com
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
  });
}

module.exports = {
  transporter,
  generateOtp,
  sendOtpEmail,
};

