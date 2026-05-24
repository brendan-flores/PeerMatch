const nodemailer = require('nodemailer');
const dns = require('dns').promises;

function hasEmailConfig() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
  );
}

// Custom DNS lookup that only returns IPv4 addresses
async function ipv4Lookup(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return addresses[0];
  } catch (error) {
    // Fallback to original hostname if IPv4 lookup fails
    return hostname;
  }
}

function getFromHeader() {
  const displayName = (process.env.EMAIL_FROM_NAME || 'PeerMatch').trim();
  const fromEmail = (process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER || '').trim();

  if (!fromEmail) {
    throw new Error('Missing sender email. Set EMAIL_FROM_EMAIL or EMAIL_USER.');
  }

  return `"${displayName}" <${fromEmail}>`;
}

async function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const isOffice365 = typeof host === 'string' && /office365\.com$/i.test(host);
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  // Resolve hostname to IPv4 address to avoid IPv6 connection issues
  const resolvedHost = await ipv4Lookup(host);

  return nodemailer.createTransport({
    host: resolvedHost,
    port,
    // For Office365: 587 + STARTTLS (secure=false, requireTLS=true)
    secure,
    requireTLS: isOffice365 ? true : process.env.EMAIL_REQUIRE_TLS === 'true' ? true : undefined,
    tls: isOffice365
      ? {
          // Office365 commonly requires TLSv1.2+
          minVersion: 'TLSv1.2',
        }
      : undefined,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Force IPv4 to avoid IPv6 connection issues on some hosting platforms
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}

/**
 * Send a verification email containing the 6-digit code.
 * @param {string} to - Recipient email address.
 * @param {string} name - Recipient name.
 * @param {string} code - Verification code.
 */
async function sendVerificationEmail(to, name, code) {
  if (!hasEmailConfig()) {
    throw new Error(
      'SMTP credentials are missing. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.'
    );
  }

  const mailOptions = {
    from: getFromHeader(),
    sender: getFromHeader(),
    to,
    subject: 'Peer Match System: Verify Your Email',
    text: `Hello ${name},\n\nYour Peer Match verification code is: ${code}\nThis code expires in ${process.env.VERIFICATION_CODE_TTL_MINUTES || 10} minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `<p>Hello ${name},</p><p>Your Peer Match verification code is: <strong>${code}</strong></p><p>This code expires in ${process.env.VERIFICATION_CODE_TTL_MINUTES || 10} minutes.</p><p>If you did not request this, please ignore this email.</p>`,
  };

  const transporter = await createTransporter();
  try {
    // Verify credentials/connection to get a clear error early.
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    return {
      delivered: true,
      messageId: info && info.messageId ? info.messageId : undefined,
      accepted: info && info.accepted ? info.accepted : [],
      rejected: info && info.rejected ? info.rejected : [],
    };
  } catch (err) {
    const smtpError =
      err && err.message ? err.message : 'Unable to send verification email through SMTP.';
    throw new Error(smtpError);
  }
}

module.exports = { sendVerificationEmail };
