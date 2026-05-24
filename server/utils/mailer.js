const { createClient } = require('@supabase/supabase-js');

function hasEmailConfig() {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_KEY
  );
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Send a verification email containing the 6-digit code using Supabase.
 * @param {string} to - Recipient email address.
 * @param {string} name - Recipient name.
 * @param {string} code - Verification code.
 */
async function sendVerificationEmail(to, name, code) {
  if (!hasEmailConfig()) {
    throw new Error(
      'Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    );
  }

  const supabase = getSupabaseClient();

  try {
    // Use Supabase Auth to send verification email
    // Note: Supabase Auth handles email verification automatically
    // We'll use their custom email sending capability
    const { data, error } = await supabase.auth.admin.sendEmail({
      email: to,
      type: 'signup',
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_MAIN_SITE_URL}/verify`,
        data: {
          verification_code: code,
          user_name: name,
        },
      },
    });

    if (error) {
      throw new Error(`Supabase email error: ${error.message}`);
    }

    return {
      delivered: true,
      messageId: data?.id,
    };
  } catch (err) {
    const emailError =
      err && err.message ? err.message : 'Unable to send verification email through Supabase.';
    throw new Error(emailError);
  }
}

module.exports = { sendVerificationEmail };
