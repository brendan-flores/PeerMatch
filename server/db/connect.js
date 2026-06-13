const { isSupabaseDbConfigured, pingDatabase } = require('./supabaseAdmin');

let dbReady = false;

const connectDB = async () => {
  if (!isSupabaseDbConfigured()) {
    console.warn(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Database operations will fail until configured.',
    );
    setTimeout(connectDB, 5000);
    return;
  }

  try {
    const ok = await pingDatabase();
    if (ok) {
      dbReady = true;
      console.log('Supabase Postgres connected');
      return;
    }
    throw new Error('Database ping failed');
  } catch (error) {
    dbReady = false;
    console.error('Supabase connection error:', error.message);
    setTimeout(connectDB, 5000);
  }
};

function isDbReady() {
  return dbReady;
}

module.exports = connectDB;
module.exports.isDbReady = isDbReady;
module.exports.pingDatabase = pingDatabase;
