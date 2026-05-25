# Supabase email setup (PeerMatch) — start to finish

PeerMatch keeps **MongoDB + your Express API** for accounts. Supabase is used only to **send verification emails** through a **Supabase Edge Function** that calls **Resend** (Supabase’s recommended transactional email provider).

Supabase does **not** replace Gmail SMTP by itself; the Edge Function sends mail via Resend’s API.

---

## What you will have when done

1. A Supabase project with one deployed Edge Function: `send-verification-email`
2. A Resend account with a verified sender domain (or Resend’s test sender for development)
3. Render API env vars so registration/resend use Supabase instead of Nodemailer SMTP

---

## Part 1 — Create accounts (15 minutes)

### Step 1: Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. **New project** → pick organization, name (e.g. `peermatch-email`), strong DB password, region close to your users.
3. Wait until the project is **Active**.

Save these from **Project Settings → API**:

| Name | Where | Used on |
|------|--------|---------|
| **Project URL** | `https://xxxxx.supabase.co` | Render: `SUPABASE_URL` |
| **service_role** key (secret) | API keys | Render: `SUPABASE_SERVICE_ROLE_KEY` |

Never put the **service_role** key in the browser or commit it to git. Only Render (API server) uses it.

### Step 2: Resend account

1. Go to [https://resend.com](https://resend.com) and sign up.
2. **API Keys** → **Create API Key** → copy it once (starts with `re_`).
3. **Domains** → add your sending domain (e.g. `cit.edu` subdomain or a domain you control).
   - Add the DNS records Resend shows (SPF/DKIM).
   - Wait until status is **Verified**.
4. **From address**: after verification, use something like `PeerMatch <noreply@yourdomain.com>`.

**Development only:** Resend allows `onboarding@resend.dev` as `from` but only delivers to **your own Resend account email** until a domain is verified.

---

## Part 2 — Deploy the Edge Function (10–20 minutes)

### Step 3: Install Supabase CLI

**Windows (PowerShell):**

```powershell
npm install -g supabase
```

Or use Scoop/winget per [Supabase CLI docs](https://supabase.com/docs/guides/cli).

Verify:

```powershell
supabase --version
```

### Step 4: Log in and link the project

In your PeerMatch repo root:

```powershell
cd "C:\Users\brenf\Documents\3RD YEAR SECOND SEM\CPEPE361\PeerMatch"
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the short id in the Supabase dashboard URL:  
`https://supabase.com/dashboard/project/<project-ref>`.

### Step 5: Set Edge Function secrets

```powershell
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set FROM_EMAIL="PeerMatch <noreply@yourdomain.com>"
supabase secrets set VERIFICATION_CODE_TTL_MINUTES=10
```

Use the same `FROM_EMAIL` you verified in Resend.

### Step 6: Deploy the function

```powershell
supabase functions deploy send-verification-email
```

You should see a URL like:

`https://xxxxx.supabase.co/functions/v1/send-verification-email`

### Step 7: Smoke-test the function (optional)

Replace placeholders:

```powershell
$SUPABASE_URL = "https://xxxxx.supabase.co"
$SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$body = '{"to":"your-test@cit.edu","name":"Test","code":"123456"}'
Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/send-verification-email" -Method POST -Headers @{ Authorization = "Bearer $SERVICE_ROLE"; apikey = $SERVICE_ROLE } -ContentType "application/json" -Body $body
```

Check the inbox (and Resend **Logs** in their dashboard).

---

## Part 3 — Wire Render API (5 minutes)

### Step 8: Environment variables on Render

Open your **Render** service (Express API) → **Environment** → add:

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT from Supabase |
| `SUPABASE_EMAIL_FUNCTION` | `send-verification-email` (optional; this is the default) |

When **both** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the API uses Supabase email and **ignores** `EMAIL_*` SMTP for verification mail.

You can leave old `EMAIL_*` vars in place as a backup; they are not used while Supabase vars are set.

### Step 9: Redeploy Render

**Manual Deploy** or push to the connected branch. Wait until the deploy is live.

### Step 10: Verify health endpoint

```text
GET https://YOUR-RENDER-API.onrender.com/api/health
```

Expected:

```json
{
  "email": "supabase_edge_function",
  "emailProvider": "supabase+resend",
  "supabaseUrl": "set"
}
```

If you see `"email": "missing_env"`, Supabase vars are not loaded on that service.

---

## Part 4 — Vercel (no Supabase keys on frontend)

Verification email is sent **only from Render**, not from the Next.js app.

On **Vercel**, keep:

- `NEXT_PUBLIC_API_BASE_URL` → your Render API URL  
- `CORS_ORIGINS` on **Render** must include your Vercel app URL(s)

Redeploy Vercel after any env change. You do **not** need `SUPABASE_*` on Vercel for email.

---

## Part 5 — Test registration on live

1. Open your live app → **Create account** with a `@cit.edu` email you can read.
2. Submit the form — the API should return success quickly (email sends in the background).
3. Check inbox and spam; check **Resend → Logs** if nothing arrives.
4. If it fails, check **Render → Logs** for `Verification email failed:`.

---

## Local development

**Option A — use Supabase from laptop**

Add to your root `.env` (same vars as Render):

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
```

Restart `npm run dev`. Register again.

**Option B — keep Gmail SMTP locally**

Do **not** set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` locally; keep `EMAIL_*` in `.env` and Nodemailer will be used.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Health shows `missing_env` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on Render, then redeploy |
| `Resend error: domain not verified` | Verify domain in Resend; fix `FROM_EMAIL` secret |
| Email only works for one address | Using `onboarding@resend.dev` without a verified domain — verify domain |
| 401 from Edge Function | Wrong service_role key; redeploy function after `verify_jwt = false` in `supabase/config.toml` |
| Still SMTP timeout on Render | Supabase vars not set — API still using `EMAIL_*` |

---

## Alternative: Supabase Auth built-in email only

Supabase can send signup/reset emails **only for Supabase Auth users** (Project Settings → Authentication → SMTP / templates). PeerMatch does **not** use Supabase Auth today; switching would mean migrating users and login to Supabase—a large change. The Edge Function + Resend path above keeps your current MongoDB registration flow.

---

## Files in this repo

| Path | Purpose |
|------|---------|
| `supabase/functions/send-verification-email/index.ts` | Edge Function (Resend) |
| `supabase/config.toml` | Function config |
| `server/utils/supabaseEmail.js` | API → Edge Function client |
| `server/utils/mailer.js` | Uses Supabase when env is set |

Full deploy checklist for Render/Vercel/MongoDB: [DEPLOY-EMAIL-SETUP.md](./DEPLOY-EMAIL-SETUP.md).
