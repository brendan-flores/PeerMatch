const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const {
  isSupabaseEmailEnabled,
  sendVerificationEmailViaSupabase,
} = require('./supabaseEmail');

function hasEmailConfig() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
  );
}

function isInstitutionalRecipient(to) {
  const domain = (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'cit.edu').trim().toLowerCase();
  const email = String(to || '').trim().toLowerCase();
  return email.endsWith(`@${domain}`) || email.endsWith(`.${domain}`);
}

function preferSmtpDelivery() {
  return process.env.EMAIL_PREFER_SMTP === '1' || process.env.EMAIL_PREFER_SMTP === 'true';
}

function shouldSendViaSmtpFirst(to) {
  return hasEmailConfig() && (preferSmtpDelivery() || isInstitutionalRecipient(to));
}

// Custom DNS lookup that only returns IPv4 addresses
async function ipv4Lookup(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return addresses[0];
  } catch (error) {
    // Fallback to original hostname if IPv4 lookup fails
    console.log('IPv4 lookup failed, falling back to original hostname:', error.message);
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
  console.log('Email host resolved:', resolvedHost);

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
    // Try to force IPv4 using lookup option
    lookup: function (hostname, options, callback) {
      dns.resolve4(hostname).then((addresses) => {
        callback(null, addresses[0], 4);
      }).catch((err) => {
        console.log('IPv4 lookup failed in transport:', err.message);
        // Fallback to default lookup
        dns.lookup(hostname, options, callback);
      });
    },
  });
}

/**
 * Send a verification email containing the 6-digit code.
 * @param {string} to - Recipient email address.
 * @param {string} name - Recipient name.
 * @param {string} code - Verification code.
 */
async function sendViaSmtp(to, name, code) {
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

/**
 * Send a verification email containing the 6-digit code.
 * Tries Supabase/Resend first unless EMAIL_PREFER_SMTP=1, then falls back to SMTP.
 */
async function sendVerificationEmail(to, name, code) {
  if (shouldSendViaSmtpFirst(to)) {
    console.log('Sending verification email via SMTP to', to);
    const result = await sendViaSmtp(to, name, code);
    console.log('SMTP verification email sent to', to, result?.messageId || '');
    return result;
  }

  if (isSupabaseEmailEnabled()) {
    try {
      const result = await sendVerificationEmailViaSupabase(to, name, code);
      console.log('Supabase/Resend verification email accepted for', to);
      return result;
    } catch (supabaseError) {
      const reason = supabaseError?.message || String(supabaseError);
      console.error('Supabase/Resend email failed:', to, reason);
      if (!hasEmailConfig()) {
        throw supabaseError;
      }
      console.log('Falling back to SMTP for', to);
      const result = await sendViaSmtp(to, name, code);
      console.log('SMTP fallback sent to', to, result?.messageId || '');
      return result;
    }
  }

  return sendViaSmtp(to, name, code);
}

module.exports = {
  sendVerificationEmail,
  hasEmailConfig,
  preferSmtpDelivery,
  shouldSendViaSmtpFirst,
};
