/**
 * Verification email via Nodemailer (SMTP) or Resend HTTP API.
 * Render free tier blocks outbound SMTP (ports 587/465) — use RESEND_API_KEY on Render.
 */

const nodemailer = require('nodemailer');
const dns = require('dns').promises;

function isValidEmailAddress(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function hasSmtpConfig() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_PORT &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS,
  );
}

function hasResendApiKey() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

function isEmailServiceEnabled() {
  return hasSmtpConfig() || hasResendApiKey();
}

function getResendFromAddress() {
  const displayName = (process.env.EMAIL_FROM_NAME || 'PeerMatch').trim();
  const fromEmail = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM_EMAIL ||
    process.env.EMAIL_USER ||
    'onboarding@resend.dev'
  ).trim();
  return `${displayName} <${fromEmail}>`;
}

async function ipv4Lookup(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return addresses[0];
  } catch {
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
  const resolvedHost = await ipv4Lookup(host);

  return nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure,
    requireTLS: isOffice365 ? true : process.env.EMAIL_REQUIRE_TLS === 'true' ? true : undefined,
    tls: isOffice365 ? { minVersion: 'TLSv1.2' } : undefined,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

function buildMailContent(name, code) {
  const fromName = process.env.EMAIL_FROM_NAME || 'PeerMatch';
  const ttlMinutes = process.env.VERIFICATION_CODE_TTL_MINUTES || 10;
  const html =
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">' +
    '<h2 style="background:#0069A8;color:white;padding:15px;text-align:center;">Welcome to ' +
    fromName +
    '</h2><div style="padding:20px;"><p>Hello <strong>' +
    name +
    '</strong>,</p><p>Your verification code is:</p>' +
    '<div style="text-align:center;margin:20px 0;"><span style="font-size:32px;font-weight:bold;color:#FA642C;">' +
    code +
    '</span></div><p>This code expires in <strong>' +
    ttlMinutes +
    ' minutes</strong>.</p></div></div>';
  const text =
    'Hello ' +
    name +
    ',\n\nYour verification code is: ' +
    code +
    '\n\nThis code expires in ' +
    ttlMinutes +
    ' minutes.\n';
  return {
    subject: fromName + ' Verification Code',
    html,
    text,
  };
}

async function sendViaResendApi(to, name, code) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set.');
  }

  const { subject, html, text } = buildMailContent(name, code);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getResendFromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof payload?.message === 'string' ? payload.message : `Resend failed (${res.status})`;
    throw new Error(detail);
  }

  return { success: true, messageId: payload?.id, provider: 'resend' };
}

async function sendViaSmtp(to, name, code) {
  const { subject, html, text } = buildMailContent(name, code);
  const transporter = await createTransporter();
  try {
    const info = await transporter.sendMail({
      from: getFromHeader(),
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: info?.messageId, provider: 'smtp' };
  } catch (err) {
    const msg = err?.message || 'SMTP send failed';
    if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(msg) && process.env.RENDER === 'true') {
      throw new Error(
        'SMTP is blocked on Render free tier (ports 587/465). Add RESEND_API_KEY on Render, or upgrade to a paid Render instance.',
      );
    }
    throw err;
  }
}

async function sendVerificationEmail(to, name, code) {
  if (!isValidEmailAddress(to)) {
    throw new Error('Invalid email: ' + to);
  }

  // Resend uses HTTPS (port 443) — works on Render free tier where SMTP is blocked.
  if (hasResendApiKey()) {
    return sendViaResendApi(to, name, code);
  }

  if (!hasSmtpConfig()) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY (Render) or SMTP EMAIL_* variables (local).',
    );
  }

  return sendViaSmtp(to, name, code);
}

module.exports = {
  sendVerificationEmail,
  isEmailServiceEnabled,
  hasSmtpConfig,
  hasResendApiKey,
};
