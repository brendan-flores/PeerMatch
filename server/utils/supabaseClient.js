const { createClient } = require('@supabase/supabase-js');
const { getSupabaseAdmin, isSupabaseDbConfigured } = require('../db/supabaseAdmin');

let cachedClient = null;

function getSupabaseApiKey() {
  return String(
    process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
  ).trim();
}

function isSupabaseConfigured() {
  return Boolean(String(process.env.SUPABASE_URL || '').trim() && getSupabaseApiKey());
}

function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = String(process.env.SUPABASE_URL || '').trim();
  const apiKey = getSupabaseApiKey();

  if (!url || !apiKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY).',
    );
  }

  cachedClient = createClient(url, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

/** Send a one-time password to the user's email via Supabase Auth. */
async function sendEmailOtp(email) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    const message = error.message || 'Could not send verification code.';
    let hint = '';
    if (/invalid api key/i.test(message)) {
      hint =
        ' Use SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) from Project Settings → API Keys. Legacy anon JWT keys may be disabled.';
    } else if (/error sending confirmation email|email address not authorized/i.test(message)) {
      hint =
        ' Supabase default email only sends to org team members. Configure custom SMTP under Authentication → SMTP Settings to deliver to @cit.edu addresses.';
    }
    const err = new Error(message + hint);
    err.supabase = error;
    throw err;
  }

  return data;
}

/** Verify email OTP token returned by Supabase. */
async function verifyEmailOtp(email, token) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: String(token || '').trim(),
    type: 'email',
  });

  if (error) {
    const err = new Error(error.message || 'Invalid or expired verification code.');
    err.supabase = error;
    throw err;
  }

  return data;
}

module.exports = {
  isSupabaseConfigured,
  isSupabaseDbConfigured,
  getSupabaseClient,
  getSupabaseAdmin,
  sendEmailOtp,
  verifyEmailOtp,
};
