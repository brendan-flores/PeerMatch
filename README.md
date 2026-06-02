# PeerMatch

PeerMatch is a campus peer-matching platform where **clients** post tasks, **freelancers** browse and submit offers, and **admins** moderate posts and users. The app is built as a **Next.js** frontend with an **Express + MongoDB** API, **Supabase Auth** for email OTP verification, and **Socket.IO** for real-time notifications.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| API | Express, Mongoose, JWT (HttpOnly cookies) |
| Database | MongoDB (Atlas in production) |
| Email verification | Supabase Auth OTP (SMTP via Resend in Supabase dashboard) |
| Realtime | Socket.IO |
| Production hosting | **Vercel** (web) + **Render** (API) |

## Features

- **Registration & login** — institutional email (`@cit.edu` by default), Supabase OTP verification, username/password stored in MongoDB
- **Client dashboard** (`/client-home`) — post tasks, manage offers (pending / in progress / completed / rejected), messages, profile
- **Freelancer dashboard** (`/freelancer-dashboard`) — browse feed, submit offers, messages, profile, public freelancer pages
- **Admin** (`/admin`) — task moderation, user management, dashboard stats (separate admin cookie)
- **Realtime** — notifications and live updates via Socket.IO

## Architecture (production)

```
Browser  →  https://peermatch-app.site/api/*   (same origin, Vercel)
                ↓ proxy
           https://peermatch-api.onrender.com   (Express API, MongoDB, JWT)

Socket.IO  →  Render API host (NEXT_PUBLIC_API_BASE_URL)
```

- The browser **never** calls Render directly for REST API calls in production (same-origin `/api/...` keeps cookies working on mobile Safari).
- **Login** uses dedicated Vercel routes (`app/api/auth/login`, etc.) that forward to Render, set `peermatch_token` on the app host, and strip `sessionToken` from the JSON sent to the browser.
- Large list responses omit full base64 avatars in feed APIs to keep proxy payloads small.

See **[docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md)** for full environment variable lists (Render, Vercel, Supabase).

## Getting started (local)

### Prerequisites

- Node.js 20+
- MongoDB running locally (or a Atlas URI in `.env`)
- Supabase project with Email OTP enabled ([docs/SUPABASE-AUTH-SETUP.md](docs/SUPABASE-AUTH-SETUP.md))

### Install & configure

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `MONGODB_URI` — local or Atlas
- `JWT_SECRET` — at least 32 characters
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — from Supabase dashboard
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
- `CORS_ORIGINS=http://localhost:3000`

Verification email is sent by **Supabase** (not legacy `EMAIL_*` vars on the API). Configure Resend SMTP in the Supabase dashboard for production deliverability.

### Run development

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Next.js (main + admin UI) | http://localhost:3000 |
| Express API | http://localhost:5000 |

Other scripts:

```bash
npm run build          # production Next.js build
npm run start:server   # API only (production mode)
npm run seed:admin     # create admin user (set SEED_ADMIN_PASSWORD)
npm run seed:tasks     # sample tasks (dev)
```

## Project structure

```
app/                    Next.js App Router (pages, components, hooks)
  api/                  Vercel API routes (proxy, auth BFF, health)
  client-home/          Client dashboard
  freelancer-dashboard/ Freelancer dashboard
  admin/                Admin dashboard
  lib/                  API client, auth session, sockets, shared logic
server/                 Express API
  routes/               auth, tasks, offers, messages, notifications, admin
  controllers/          auth, messages, users
  models/               User, ClientTask, Offer, Message, etc.
  middleware/           JWT auth
  services/             notifications, reviews, budget suggest
docs/                   Deployment and Supabase guides
middleware.ts           Host-based routing (main vs admin domain)
```

## Environment variables

| Where | What to set |
|-------|-------------|
| **Local** | `.env` from [.env.example](.env.example) |
| **Render (API)** | `MONGODB_URI`, `JWT_*`, `CORS_ORIGINS`, `SUPABASE_*`, `TRUST_PROXY` — no `EMAIL_*` |
| **Vercel (web)** | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MAIN_SITE_URL`, `MAIN_SITE_HOSTS`, admin URL/host vars — no API secrets |

`API_PROXY_URL` on Vercel is **optional**; the server proxy uses `NEXT_PUBLIC_API_BASE_URL` when unset.

Do **not** set `COOKIE_DOMAIN` on Render unless main and admin share a parent domain.

## Deployment

1. **API** — deploy `server/` to Render (or similar). Set env from [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md). Confirm `GET /api/health` returns `database: connected` and `email: supabase_otp`.
2. **Web** — deploy the repo to Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to your Render URL. Redeploy after env changes.
3. **Supabase** — Site URL, redirect URLs, and Resend SMTP ([docs/SUPABASE-AUTH-SETUP.md](docs/SUPABASE-AUTH-SETUP.md)).

Detailed steps: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

### Post-deploy checks

1. `https://<your-api>/api/health` — JSON with `ok`, `database`, `email`
2. `https://<your-site>/api/health` — same JSON (proxy + `NEXT_PUBLIC_API_BASE_URL`)
3. Login at `/login` — cookie `peermatch_token` on the **app** domain (Application → Cookies in DevTools)
4. Feed loads — `GET /api/tasks` returns `posts` with a non-empty body (not HTTP 200 with size 0)

Login and dashboard data require **both** Render and Vercel on the latest build after auth/proxy changes.

## API overview (selected routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register (sends Supabase OTP) |
| POST | `/api/auth/verify-otp` | — | Verify email, create session |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/tasks` | — | Public approved feed |
| GET | `/api/tasks/mine` | ✓ | Client’s posts |
| GET | `/api/offers/mine` | ✓ | Client offers |
| GET | `/api/messages/conversations` | ✓ | Message threads |
| GET | `/api/notifications` | ✓ | Notifications |

Admin routes live under `/api/admin/*` with `peermatch_admin_token`.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login works but sections are empty | Redeploy both Vercel and Render; check `GET /api/tasks` response size in Network tab |
| “Could not read your session” / empty `/api/auth/me` | Cookie not on app domain — redeploy latest login BFF routes |
| `/api/health` blank in browser but works in curl | Hard refresh; check response body size |
| Verification email not received | Supabase SMTP / Resend config, not Render `EMAIL_*` |
| CORS errors | Add your site URL to `CORS_ORIGINS` on Render |

## Documentation

- [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md) — production env checklist
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) — Vercel + admin domain setup
- [docs/SUPABASE-AUTH-SETUP.md](docs/SUPABASE-AUTH-SETUP.md) — Supabase OTP and SMTP

## License

Private academic project — see course/repository policies.
