# Live deployment: email, Vercel, Render, MongoDB

Data is stored in **MongoDB Atlas** (not Supabase). Verification email is sent from the **Render API** using either:

- **Supabase Edge Function + Resend** (recommended for production) — see **[SUPABASE-EMAIL-SETUP.md](./SUPABASE-EMAIL-SETUP.md)**
- **SMTP (Nodemailer)** via `EMAIL_*` on Render — sections below

## Who does what

| Service | Role | Email settings? |
|---------|------|-----------------|
| **Vercel** | Next.js website | **No** — do not put EMAIL_* here |
| **Render** | Express API + email | **Yes** — `SUPABASE_*` **or** `EMAIL_*` |
| **Supabase** | Edge Function only (optional) | Resend API key in function secrets |
| **MongoDB Atlas** | Database | **No** — only `MONGODB_URI` on Render |

---

## 1. Render (API) — required environment variables

In **Render → your Web Service → Environment**, add:

### Database & auth
```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster....mongodb.net/peer-match?...
JWT_SECRET=<long random string, 32+ chars>
TRUST_PROXY=1
```

### CORS (must include your live site)
```
CORS_ORIGINS=https://YOUR-APP.vercel.app,https://YOUR-ADMIN.vercel.app
```
Use your real Vercel URLs (no trailing slash).

### Email (copy from what works in local `.env`)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_REQUIRE_TLS=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-not-normal-password
EMAIL_FROM_NAME=PeerMatch
EMAIL_FROM_EMAIL=your-email@gmail.com
VERIFICATION_CODE_TTL_MINUTES=10
INSTITUTIONAL_EMAIL_DOMAIN=cit.edu
```

### Gmail on Render
- Turn on **2-Step Verification** on the Google account.
- Create an **App Password**: Google Account → Security → App passwords.
- Use that 16-character password as `EMAIL_PASS` (not your normal Gmail password).

### School / Outlook (@cit.edu) — often better for production
```
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=yourname@cit.edu
EMAIL_PASS=<Microsoft app password>
EMAIL_FROM_EMAIL=yourname@cit.edu
EMAIL_FROM_NAME=PeerMatch
```

After saving env vars, click **Manual Deploy → Deploy latest commit**.

### Check Render is configured
Open in browser:
```
https://YOUR-API.onrender.com/api/health
```
You should see:
```json
{
  "ok": true,
  "database": "connected",
  "email": "configured",
  "emailHost": "set",
  "corsOrigins": "set"
}
```
If `email` is `missing_env`, EMAIL_* variables are not set on Render.

---

## 2. MongoDB Atlas (not Supabase)

1. **Atlas → Network Access** → allow `0.0.0.0/0` (or Render’s IPs) so Render can connect.
2. **Database Access** → user with read/write on `peer-match` database.
3. Copy the connection string into Render as `MONGODB_URI`.

---

## 3. Vercel (frontend)

In **Vercel → Project → Settings → Environment Variables**:

### Recommended (avoids serverless timeouts)
```
NEXT_PUBLIC_API_BASE_URL=https://YOUR-API.onrender.com
```
Also set on **Render**:
```
CORS_ORIGINS=https://YOUR-APP.vercel.app
```

### Site URLs (your real domains)
```
NEXT_PUBLIC_MAIN_SITE_URL=https://YOUR-APP.vercel.app
MAIN_SITE_HOSTS=YOUR-APP.vercel.app
API_PROXY_URL=https://YOUR-API.onrender.com
```

**Do not** put `EMAIL_*` on Vercel — they are ignored.

Redeploy Vercel after changing variables.

---

## 4. Supabase

Not used in this project. If you only use Supabase for something else, you do not need to configure it for PeerMatch email.

---

## 5. Why email works locally but not live

| Cause | Fix |
|-------|-----|
| EMAIL_* only in local `.env`, not on Render | Add all EMAIL_* to Render env |
| Gmail blocks datacenter IP | Use Gmail **App Password** or switch to Office365 |
| SMTP connection timeout on Render | Use Office365 or App Password; check `/api/health` |
| Registration succeeded but no email | Check **Render → Logs** for `Verification email failed:` |
| Wrong email domain at signup | User must use `...@cit.edu` |

---

## 6. What to send if you still need help

1. Screenshot of Render **Environment** variable **names** (hide values/passwords).
2. Result of `https://YOUR-API.onrender.com/api/health` (JSON).
3. One line from Render **Logs** after signup containing `Verification email failed` (if any).
4. Your Vercel URL and Render API URL.

Do **not** share `EMAIL_PASS`, `JWT_SECRET`, or `MONGODB_URI` passwords in chat.
