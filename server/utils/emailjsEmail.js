/**
 * Sends verification email through Nodemailer (Gmail SMTP).
 * Configure with GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env
 */

const nodemailer = require('nodemailer');

function isNodemailerEnabled() {
  const email = String(process.env.GMAIL_EMAIL || '').trim();
  const password = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  return Boolean(email && password);
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Force IPv4 to avoid IPv6 connection issues on Render
      family: 4,
    });
  }
  return transporter;
}

async function sendVerificationEmailViaNodemailer(to, name, code) {
  if (!isNodemailerEnabled()) {
    throw new Error(
      'Nodemailer is not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env'
    );
  }

  function isValidEmailAddress(e) {
    if (!e || typeof e !== 'string') return false;
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
  }

  if (!isValidEmailAddress(to)) {
    throw new Error(`Invalid or empty recipient email: "${String(to)}"`);
  }

  const ttlMinutes = process.env.VERIFICATION_CODE_TTL_MINUTES || 10;
  const fromName = process.env.EMAIL_FROM_NAME || 'PeerMatch';
  const senderEmail = process.env.GMAIL_EMAIL;

  // Log outgoing email (redacted)
  try {
    console.log('[Nodemailer] Sending verification email:', {
      from: senderEmail,
      to: to.slice(0, 3) + '...',
      name: name,
      code: '***',
    });
  } catch (logErr) {
    // ignore logging failures
  }

  const htmlContent = `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0069A8 0%, #004f7d 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to ${fromName}! 🎉</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px; color: #555;">To complete your account setup, please use the verification code below:</p>
          
          <div style="background: white; border: 2px solid #0069A8; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <h2 style="margin: 15px 0 0 0; font-size: 42px; letter-spacing: 8px; color: #FA642C; font-weight: bold; font-family: 'Courier New', monospace;">${code}</h2>
          </div>
          
          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            ⏱️ This code will expire in <strong>${ttlMinutes} minutes</strong>.
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>For your security:</strong> Please do not share this code with anyone.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #888; margin: 20px 0;">
            If you did not request this verification, you can safely ignore this email—no action is needed.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 13px; color: #666; margin: 10px 0;">
            💡 <strong>Need help?</strong><br>
            If you're having trouble verifying your account, feel free to contact our support team.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #333; margin: 0; text-align: center;">
            Best regards,<br>
            <strong>${fromName} Team</strong><br>
            <span style="font-size: 12px; color: #999;">Connecting people, smarter. 🌐</span>
          </p>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `${fromName} <${senderEmail}>`,
    to: to,
    subject: `Your ${fromName} Verification Code: ${code}`,
    html: htmlContent,
    text: `Hello ${name},

Welcome to ${fromName}!

To complete your account setup, please use the verification code below:

━━━━━━━━━━━━━━━━━━━
🔑 ${code}
━━━━━━━━━━━━━━━━━━━

⏱️ This code will expire in ${ttlMinutes} minutes.

For your security, please do not share this code with anyone.

If you did not request this verification, you can safely ignore this email—no action is needed.

---

💡 Need help?
If you're having trouble verifying your account, feel free to contact our support team.

---

Best regards,
${fromName} Team
Connecting people, smarter. 🌐`,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    return {
      delivered: true,
      messageId: result.messageId || 'nodemailer-' + Date.now(),
      provider: 'nodemailer',
    };
  } catch (error) {
    throw new Error(`Nodemailer failed: ${error.message}`);
  }
}

module.exports = {
  isNodemailerEnabled,
  sendVerificationEmailViaNodemailer,
};
