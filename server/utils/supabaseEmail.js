/**
 * Sends verification email through Supabase Edge Function (Resend inside the function).
 */

function trimSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function isSupabaseEmailEnabled() {
  return Boolean(trimSlash(process.env.SUPABASE_URL) && trimSlash(process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function getFunctionUrl() {
  const base = trimSlash(process.env.SUPABASE_URL);
  const name = String(process.env.SUPABASE_EMAIL_FUNCTION || 'send-verification-email').trim();
  return `${base}/functions/v1/${name}`;
}

async function sendVerificationEmailViaSupabase(to, name, code) {
  const url = getFunctionUrl();
  const serviceKey = trimSlash(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, name, code }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail =
      typeof payload?.message === 'string' ? payload.message : `Supabase email failed (${res.status})`;
    throw new Error(detail);
  }

  return payload;
}

module.exports = {
  isSupabaseEmailEnabled,
  sendVerificationEmailViaSupabase,
};
