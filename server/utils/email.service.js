/**
 * Email Service - Nodemailer with Gmail SMTP
 * Sends verification emails using Gmail App Password authentication
 */

const nodemailer = require('nodemailer');

// Validate email format
function isValidEmailAddress(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Check if email service is configured
function isEmailServiceEnabled() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

// Create and cache Nodemailer transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!isEmailServiceEnabled()) {
      throw new Error('EMAIL_USER and EMAIL_PASS are not set');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

/**
 * Send verification email
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} code - 6-digit verification code
 * @returns {Promise<Object>} Result with delivery status and message ID
 */
async function sendVerificationEmail(to, name, code) {
  if (!isValidEmailAddress(to)) {
    throw new Error('Invalid email: ' + to);
  }

  const fromName = process.env.EMAIL_FROM_NAME || 'PeerMatch';
  const ttlMinutes = process.env.VERIFICATION_CODE_TTL_MINUTES || 10;

  // HTML email template
  const html =
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">' +
    '<h2 style="background:#0069A8;color:white;padding:15px;text-align:center;">' +
    'Welcome to ' + fromName +
    '</h2>' +
    '<div style="padding:20px;">' +
    '<p>Hello <strong>' + name + '</strong>,</p>' +
    '<p>Your verification code is:</p>' +
    '<div style="text-align:center;margin:20px 0;">' +
    '<span style="font-size:32px;font-weight:bold;color:#FA642C;">' +
    code +
    '</span>' +
    '</div>' +
    '<p>This code expires in <strong>' + ttlMinutes + ' minutes</strong>.</p>' +
    '<p style="color:#888;font-size:13px;">' +
    'If you did not request this, you can ignore this email.' +
    '</p>' +
    '<hr/>' +
    '<p style="text-align:center;font-size:12px;color:#999;">' +
    fromName + ' Team' +
    '</p>' +
    '</div>' +
    '</div>';

  // Plain text version
  const text =
    'Hello ' + name + ',\n\n' +
    'Your verification code is: ' + code + '\n\n' +
    'This code expires in ' + ttlMinutes + ' minutes.\n\n' +
    'If you did not request this, you can ignore this email.\n\n' +
    '- ' + fromName + ' Team';

  const mailOptions = {
    from: fromName + ' <' + process.env.EMAIL_USER + '>',
    to: to,
    subject: fromName + ' Verification Code',
    html: html,
    text: text,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);

    console.log('[Email] Sent:', {
      to: to,
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('[Email] Failed:', error.message);
    throw new Error('Failed to send email');
  }
}

module.exports = {
  sendVerificationEmail,
  isEmailServiceEnabled,
};
