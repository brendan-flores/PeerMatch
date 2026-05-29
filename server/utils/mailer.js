const {
  isNodemailerEnabled,
  sendVerificationEmailViaNodemailer,
} = require('./emailjsEmail');

/**
 * Send a verification email containing the 6-digit code via Nodemailer (Gmail).
 */
async function sendVerificationEmail(to, name, code) {
  if (!isNodemailerEnabled()) {
    throw new Error(
      'Nodemailer is not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env'
    );
  }

  try {
    const result = await sendVerificationEmailViaNodemailer(to, name, code);
    console.log('[Nodemailer] Verification email sent for', to);
    return result;
  } catch (error) {
    console.error('[Nodemailer] Email failed:', to, error?.message || String(error));
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
};
