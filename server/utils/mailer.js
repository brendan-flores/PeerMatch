const {
  isNodemailerEnabled,
  sendVerificationEmailViaNodemailer,
} = require('./emailjsEmail');
const {
  isResendEnabled,
  sendVerificationEmailViaResend,
} = require('./resendEmail');

/**
 * Send a verification email containing the 6-digit code.
 * Prefers Resend (works on Render and local) over Nodemailer (SMTP, blocked on Render).
 */
async function sendVerificationEmail(to, name, code) {
  // Try Resend first (works on Render and local)
  if (isResendEnabled()) {
    try {
      const result = await sendVerificationEmailViaResend(to, name, code);
      console.log('[Resend] Verification email sent for', to);
      return result;
    } catch (error) {
      console.error('[Resend] Email failed:', to, error?.message || String(error));
      // Fall through to Nodemailer if Resend fails
    }
  }

  // Fall back to Nodemailer (Gmail SMTP) - works locally but blocked on Render
  if (isNodemailerEnabled()) {
    try {
      const result = await sendVerificationEmailViaNodemailer(to, name, code);
      console.log('[Nodemailer] Verification email sent for', to);
      return result;
    } catch (error) {
      console.error('[Nodemailer] Email failed:', to, error?.message || String(error));
      throw error;
    }
  }

  throw new Error(
    'No email provider configured. Set RESEND_API_KEY (recommended) or GMAIL_EMAIL + GMAIL_APP_PASSWORD in .env'
  );
}

module.exports = {
  sendVerificationEmail,
};
