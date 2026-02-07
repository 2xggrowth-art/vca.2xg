/**
 * Email Utility
 * Sends emails using nodemailer with SMTP
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'VCA <noreply@example.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

let transporter = null;

/**
 * Get or create the nodemailer transporter
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not configured - email sending will be disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} [userName] - Optional user name for personalization
 */
async function sendPasswordResetEmail(email, token, userName = null) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Email Disabled] Password reset for ${email}, token: ${token}`);
    return { success: true, disabled: true };
  }

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const displayName = userName || email.split('@')[0];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Logo/Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #7c3aed;">VCA</h1>
              </div>

              <!-- Content -->
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1f2937;">
                Reset Your Password
              </h2>

              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Hi ${displayName},
              </p>

              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                  Reset Password
                </a>
              </div>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                This link will expire in <strong>1 hour</strong>.
              </p>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <!-- Fallback Link -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 8px 0 0; font-size: 13px; word-break: break-all;">
                  <a href="${resetUrl}" style="color: #7c3aed;">${resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
          Viral Content Analyzer
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Reset Your Password

Hi ${displayName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email. Your password will remain unchanged.

- Viral Content Analyzer
  `;

  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Reset Your Password - VCA',
    text,
    html,
  });

  return { success: true };
}

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
};
