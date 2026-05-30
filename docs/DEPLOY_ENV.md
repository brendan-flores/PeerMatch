# Environment variables (Render + Vercel + Supabase)

## How the app talks to the API

| Where | What happens |
|-------|----------------|
| **Browser** | Calls same-origin `https://peermatch-app.site/api/...` (Vercel proxy) |
| **Vercel server** | Proxies to Render using `NEXT_PUBLIC_API_BASE_URL`; **login sets `peermatch_token` on the app host** via `app/api/auth/login` |
| **Socket.IO** | Connects to `NEXT_PUBLIC_API_BASE_URL` (Render) with cookies |

You do **not** need `API_PROXY_URL` on Vercel if `NEXT_PUBLIC_API_BASE_URL` is set to your Render URL.

Do **not** remove `NEXT_PUBLIC_API_BASE_URL` from Vercel — without it the proxy has nowhere to forward requests.

---

## Render (API)

### Remove (old email stack — not used with Supabase Auth)

- `EMAIL_FROM_EMAIL`, `EMAIL_FROM_NAME`, `EMAIL_HOST`, `EMAIL_PASS`, `EMAIL_PORT`
- `EMAIL_REQUIRE_TLS`, `EMAIL_SECURE`, `EMAIL_SYNC_SEND`, `EMAIL_USER`
- `VERIFICATION_CODE_TTL_MINUTES`

Resend belongs in **Supabase SMTP**, not Render.

### Keep / set

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | Long random (32+ chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_COOKIE_SAMESITE` | `lax` (recommended with Vercel proxy; `none` still works) |
| `JWT_COOKIE_SECURE` | `true` |
| `JWT_COOKIE_NAME` | `peermatch_token` |
| `TRUST_PROXY` | `1` |
| `INSTITUTIONAL_EMAIL_DOMAIN` | `cit.edu` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (or leave default on Render) |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` from Supabase → API Keys |

### `CORS_ORIGINS` (comma-separated, no trailing slashes)

```
https://peermatch-app.site,https://www.peermatch-app.site,https://peermatch-app.vercel.app,https://peermatch-admin.vercel.app,http://localhost:3000
```

Redeploy Render after changes.

---

## Vercel (frontend)

### Remove

| Variable | Why |
|----------|-----|
| `API_PROXY_URL` | Optional; proxy uses `NEXT_PUBLIC_API_BASE_URL` |
| `SUPABASE_*`, `RESEND_*`, `EMAIL_*`, `MONGODB_URI`, `JWT_SECRET` | API-only secrets |

### Keep / set

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://peermatch-api.onrender.com` |
| `NEXT_PUBLIC_MAIN_SITE_URL` | `https://peermatch-app.site` |
| `MAIN_SITE_HOSTS` | `peermatch-app.site,www.peermatch-app.site,peermatch-app.vercel.app` |
| `NEXT_PUBLIC_ADMIN_SITE_URL` | Your admin Vercel URL |
| `ADMIN_SITE_HOSTS` | Matching admin host(s) |

Redeploy Vercel after changes.

---

## Supabase dashboard

| Setting | Value |
|---------|--------|
| SMTP host | `smtp.resend.com` |
| SMTP port | `587` |
| Username | `resend` |
| Password | Resend API key (`re_...`) |
| Sender | `noreply@peermatch-app.site` |
| Site URL | `https://peermatch-app.site` |
| Redirect URLs | `https://peermatch-app.site/**`, `http://localhost:3000/**` |

---

## Quick checks after deploy

1. `https://peermatch-api.onrender.com/api/health` → JSON with `database: connected`, `email: supabase_otp`
2. `https://peermatch-app.site/api/health` → **same JSON** (proves Vercel proxy + `NEXT_PUBLIC_API_BASE_URL`)
3. If the page looks blank in Brave, disable Shields for your site or view source — JSON may not render visibly.
4. Login at `https://peermatch-app.site/login`

If (1) works but (2) does not → fix `NEXT_PUBLIC_API_BASE_URL` on Vercel and redeploy.
