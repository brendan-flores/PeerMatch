# Live deployment: email, Vercel, Render, MongoDB

Verification email is sent from the **Render API** using **Nodemailer (SMTP)** — Gmail or Office 365.

## Who does what

| Service | Role | Email settings? |
|---------|------|-----------------|
| **Vercel** | Next.js website | **No** — do not put EMAIL_* here |
| **Render** | Express API + SMTP | **Yes** — all `EMAIL_*` variables |
| **MongoDB Atlas** | Database | **No** — only `MONGODB_URI` on Render |

---

## 1. Render (API) — required environment variables

In **Render → your Web Service → Environment**, add:

### Database & auth
```
MONGODB_URI=mongodb://USER:PASSWORD@ac-....mongodb.net:27017,.../peer-match?ssl=true&replicaSet=...
JWT_SECRET=<long random string, 32+ chars>
TRUST_PROXY=1
```

Use the **standard** Atlas connection string (non-SRV) if `mongodb+srv` fails with DNS errors.

### CORS (must include your live site)
```
CORS_ORIGINS=https://YOUR-APP.vercel.app,https://YOUR-ADMIN.vercel.app
```

### Email (Nodemailer / SMTP)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_REQUIRE_TLS=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM_NAME=PeerMatch
EMAIL_FROM_EMAIL=your-email@gmail.com
EMAIL_SYNC_SEND=true
VERIFICATION_CODE_TTL_MINUTES=10
INSTITUTIONAL_EMAIL_DOMAIN=cit.edu
```

Remove **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** if present — not used.

### Gmail on Render
- Turn on **2-Step Verification** on the Google account.
- Create an **App Password**: Google Account → Security → App passwords.
- Use that 16-character password as `EMAIL_PASS`.

After saving env vars, **Manual Deploy → Deploy latest commit**.

### Health check
```
https://YOUR-API.onrender.com/api/health
```
Expected:
```json
{
  "email": "smtp",
  "emailProvider": "nodemailer"
}
```

---

## 2. MongoDB Atlas

1. **Network Access** → allow `0.0.0.0/0` (or Render IPs).
2. **Database Access** → user with read/write on `peer-match` database.
3. Copy connection string into Render as `MONGODB_URI`.

---

## 3. Vercel (frontend)

```
NEXT_PUBLIC_API_BASE_URL=https://YOUR-API.onrender.com
NEXT_PUBLIC_MAIN_SITE_URL=https://YOUR-APP.vercel.app
CORS_ORIGINS on Render must include your Vercel URL
```

**Do not** put `EMAIL_*` on Vercel.

---

## 4. Troubleshooting

| Cause | Fix |
|-------|-----|
| EMAIL_* missing on Render | Add all SMTP variables |
| Gmail blocks Render | Use App Password |
| No email after signup | Render Logs → `Verification email failed` |
| Registration must use `@cit.edu` | `INSTITUTIONAL_EMAIL_DOMAIN=cit.edu` |
