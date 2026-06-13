const { createClient } = require('@supabase/supabase-js');

let cachedAdmin = null;

function isSupabaseDbConfigured() {
  return Boolean(
    String(process.env.SUPABASE_URL || '').trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  );
}

function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const url = String(process.env.SUPABASE_URL || '').trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  cachedAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdmin;
}

async function pingDatabase() {
  if (!isSupabaseDbConfigured()) return false;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

module.exports = {
  isSupabaseDbConfigured,
  getSupabaseAdmin,
  pingDatabase,
};
