/**
 * Sends verification email through a Supabase Edge Function (Resend API inside the function).
 * Enable by setting SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Render.
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

  // Add AbortController for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, name, code }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        typeof payload?.message === 'string' ? payload.message : `Supabase email failed (${res.status})`;
      throw new Error(detail);
    }

    return payload;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Supabase email request timed out after 15 seconds');
    }
    throw error;
  }
}

module.exports = {
  isSupabaseEmailEnabled,
  sendVerificationEmailViaSupabase,
};
