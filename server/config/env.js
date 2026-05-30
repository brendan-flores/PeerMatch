/**
 * Load .env with UTF-8, UTF-8 BOM, or UTF-16 LE (Windows "Unicode") encoding.
 */

const path = require('path');
const fs = require('fs');

function looksLikeUtf16LeWithoutBom(buf) {
  if (buf.length < 4) return false;
  let asciiPairs = 0;
  const sample = Math.min(buf.length, 400);
  for (let i = 0; i + 1 < sample; i += 2) {
    if (buf[i + 1] === 0 && buf[i] >= 0x20 && buf[i] <= 0x7e) asciiPairs += 1;
  }
  return asciiPairs >= 4;
}

function readEnvFileContents(envPath) {
  const buf = fs.readFileSync(envPath);

  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString('utf16le');
  }

  if (looksLikeUtf16LeWithoutBom(buf)) {
    return buf.toString('utf16le');
  }

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }

  const asUtf8 = buf.toString('utf8');
  if (asUtf8.charCodeAt(0) === 0xfeff) {
    return asUtf8.slice(1);
  }

  return asUtf8;
}

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');

  try {
    const content = readEnvFileContents(envPath);
    const lines = content.split(/\r?\n/);
    let count = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return;
      }

      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim().replace(/^\uFEFF/, '');
      const value = trimmed.slice(eq + 1).trim();

      if (!key || !value) {
        return;
      }

      // Do not override platform env (Render/Vercel) when already set.
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
        count += 1;
      }
    });

    console.log(`Loaded ${count} variables from .env`);
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'set' : 'missing'}`);
    console.log(
      `Supabase: ${process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY) ? 'set' : 'missing'}`,
    );
    return true;
  } catch (error) {
    console.warn(`Failed to load .env: ${error.message}`);
    return false;
  }
}

module.exports = { loadEnv };
