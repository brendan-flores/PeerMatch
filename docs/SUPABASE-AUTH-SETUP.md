# Supabase Auth OTP setup (PeerMatch)

PeerMatch uses **Supabase Auth** for email verification (one-time passwords). **Supabase Postgres** stores user profiles (username, password hash, course, etc.). **JWT cookies** power app sessions after verification.

No SMTP, Nodemailer, or Resend is used for verification.

---

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name (e.g. `peermatch`), database password, region.
3. Wait until the project finishes provisioning.

---

## 2. Get API keys

1. In the Supabase dashboard: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

These go on your **Express API** (Render), not Vercel.

---

## 3. Enable Email provider

1. **Authentication** → **Providers**.
2. Open **Email**.
3. Enable **Email** sign-in.
4. Optional: disable Google, GitHub, etc. if you only want email OTP.
5. Save.

Supabase sends OTP emails from its own mail infrastructure (works for Outlook and `@cit.edu` when Supabase can deliver to that domain).

---

## 4. URL settings

1. **Authentication** → **URL Configuration**.
2. **Site URL** (development): `http://localhost:3000`
3. **Site URL** (production): `https://peermatch-app.vercel.app` (your main app URL)
4. **Redirect URLs** — add:
   - `http://localhost:3000/**`
   - `https://peermatch-app.vercel.app/**`
5. Save.

PeerMatch verifies OTP on the **backend**; these URLs mainly affect Supabase dashboard defaults and any future magic-link flows.

---

## 5. Email templates (OTP code)

1. **Authentication** → **Emails** → **Templates**.
2. Edit **Magic Link** and **Confirm sign up** — both must include `{{ .Token }}`:

```html
<h2>PeerMatch verification</h2>
<p>Your verification code is:</p>
<h1 style="letter-spacing: 4px;">{{ .Token }}</h1>
<p>Enter this 6-digit code on the PeerMatch verify page.</p>
```

3. Save each template.

### Force 6-digit codes (if you receive 8 digits)

The template does **not** control length — Supabase project setting `mailer_otp_length` does. PeerMatch only accepts **6 digits**.

**Option A — Dashboard (if shown):**  
**Authentication** → **Sign In / Providers** → **Email** → set **OTP length** to **6** → Save.

**Option B — Management API (always works):**

1. Create a personal access token: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Run (replace `YOUR_TOKEN`):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/krbwawqvwsdgjtajoivv/config/auth" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"mailer_otp_length\": 6}"
```

3. Resend OTP — the new email should show a **6-digit** `{{ .Token }}`.

---

## 6. Environment variables

### Local (`.env` in project root, UTF-8)

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INSTITUTIONAL_EMAIL_DOMAIN=cit.edu
JWT_SECRET=your-long-secret
CORS_ORIGINS=http://localhost:3000
```

Remove old email vars if still present: `EMAIL_*`, `RESEND_*`, `EMAIL_SYNC_SEND`, `VERIFICATION_CODE_TTL_MINUTES`.

### Render (API service only)

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (database access) |
| `INSTITUTIONAL_EMAIL_DOMAIN` | `cit.edu` |
| `JWT_SECRET` | same as before |
| `CORS_ORIGINS` | Vercel app URLs (comma-separated) |

**Remove** from Render: `EMAIL_*`, `RESEND_*`.

Vercel does **not** need Supabase keys for this setup.

---

## 7. API endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | `{ username, email, password, role }` | Creates MongoDB profile + sends Supabase OTP |
| `POST` | `/api/auth/send-otp` | `{ email }` | Resend OTP via `signInWithOtp` |
| `POST` | `/api/auth/verify-otp` | `{ email, token }` | Verify via `verifyOtp`, activate account, set JWT cookie |
| `POST` | `/api/auth/verify` | `{ email, code }` | Legacy alias (same as verify-otp) |
| `POST` | `/api/auth/resend` | `{ email }` | Resend if pending registration exists |
| `POST` | `/api/auth/login` | `{ email, password }` | Password login (unchanged) |

Health check: `GET /api/health` → `"emailProvider": "supabase"`.

---

## 8. Test the OTP flow

1. Start API and web: `npm run dev`
2. Confirm health: `http://localhost:5000/api/health` → `email: "supabase_otp"`, `database: "connected"`.
3. Register at `http://localhost:3000/register/client` with a real `@cit.edu` or Outlook address.
4. Check inbox (and spam) for Supabase email with a **6-digit code**.
5. Enter code on `/verify?email=...`.
6. You should land on client/freelancer details with a logged-in session.

**Resend:** use “Resend code” on the verify page (calls `/api/auth/send-otp`).

**Troubleshooting**

- Database connection errors → set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (UTF-8 file), and run `supabase/migrations/001_initial_schema.sql`.
- `Email verification is not configured` → set `SUPABASE_URL` and `SUPABASE_ANON_KEY`, restart API.
- `Invalid or expired verification code` → request a new code; Supabase OTP expires quickly.
- No email received → check Supabase **Authentication → Logs**; confirm Email provider is enabled; try a personal Gmail first to isolate delivery issues.

---

## 9. Architecture summary

```
Register → MongoDB (pending user) → Supabase signInWithOtp → email with 6-digit code
Verify   → Supabase verifyOtp → MongoDB verified=true → PeerMatch JWT cookie
Login    → MongoDB password check (after verified)
```

Supabase holds the auth identity for OTP; PeerMatch JWT + MongoDB hold app data and sessions.
