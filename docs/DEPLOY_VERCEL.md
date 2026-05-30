# Deploy PeerMatch on Vercel (main + admin on different domains)

The app is one Next.js repo: main routes (`/`, `/login`, `/client-home`, …) and admin routes (`/admin/...`). The API is a separate Node server (`server/`) — deploy it to Render, Railway, Fly.io, etc.

## Architecture

| Service | Your URL | Role |
|--------|-------------|------|
| Main Next.js | `https://peermatch-app.vercel.app` | Students / clients / freelancers |
| Admin Next.js | `https://peermatch-admin.vercel.app` | Admin dashboard |
| API | `https://peermatch-api.onrender.com` | MongoDB, auth cookies, Socket.IO |

The browser calls same-origin `/api/*` on Vercel (proxied to Render). `NEXT_PUBLIC_API_BASE_URL` must point at Render for the proxy and Socket.IO. See [DEPLOY_ENV.md](./DEPLOY_ENV.md). Admin uses a separate cookie name (`peermatch_admin_token`).

---

## Option A — One Vercel project, two domains (simplest)

1. Import the repo in Vercel (Framework: Next.js).
2. **Settings → Domains**: add `peermatch-app.vercel.app` and `peermatch-admin.vercel.app`.
3. **Settings → Environment Variables** (Production):

   ```
   NEXT_PUBLIC_API_BASE_URL=https://peermatch-api.onrender.com
   NEXT_PUBLIC_MAIN_SITE_URL=https://peermatch-app.vercel.app
   NEXT_PUBLIC_ADMIN_SITE_URL=https://peermatch-admin.vercel.app
   MAIN_SITE_HOSTS=peermatch-app.vercel.app
   ADMIN_SITE_HOSTS=peermatch-admin.vercel.app
   ```

4. Deploy the API with:

   ```
   CORS_ORIGINS=https://peermatch-app.vercel.app,https://peermatch-app.site,https://peermatch-admin.vercel.app
   JWT_COOKIE_SAMESITE=none
   JWT_COOKIE_SECURE=true
   TRUST_PROXY=1
   ```

   `NEXT_PUBLIC_API_BASE_URL` is required on Vercel (used by the server proxy and Socket.IO). `API_PROXY_URL` is optional.

   Browser API calls use same-origin `/api` so login cookies work on mobile Safari.

   Set `NEXT_PUBLIC_MAIN_SITE_URL=https://peermatch-app.site` so users who land on `*.vercel.app` are redirected before login.

5. `middleware.ts` will:
   - On **admin** host: `/` → `/admin/dashboard`, block main-app paths, keep `/admin/*`.
   - On **main** host: `/admin/*` → redirect to `NEXT_PUBLIC_ADMIN_SITE_URL`.

Local dev: one server on port 3000 — main at `/`, admin at `/admin` (no `ADMIN_SITE_HOSTS` needed).

---

## Option B — Two Vercel projects (same repo)

Useful if you want separate env/build settings.

| Project | Domain | Extra env |
|---------|--------|-----------|
| `peermatch-web` | `peermatch-app.vercel.app` | `MAIN_SITE_HOSTS=peermatch-app.vercel.app` |
| `peermatch-admin` | `peermatch-admin.vercel.app` | `ADMIN_SITE_HOSTS=peermatch-admin.vercel.app` |

Set the **same** `NEXT_PUBLIC_*` URLs on both projects so redirects and API calls stay correct.

---

## API checklist

- [ ] `CORS_ORIGINS` lists both frontend origins (comma-separated, no trailing slashes).
- [ ] HTTPS in production; cookies use `JWT_COOKIE_SAMESITE=none` and `JWT_COOKIE_SECURE=true` when frontends and API are on different sites.
- [ ] Do **not** set `COOKIE_DOMAIN` unless both sites share a parent domain (e.g. `.yourdomain.com`).
- [ ] Seed admin: `npm run seed:admin` with `SEED_ADMIN_PASSWORD` set.

---

## Verify after deploy

1. Open main domain → login as client/freelancer works.
2. Open admin domain → `/admin/login` works; `/admin` on main domain redirects to admin URL.
3. Admin login does not log you into the main app (separate cookie).
4. Notifications / real-time: Socket.IO origin must be allowed on the API (same `CORS_ORIGINS`).
