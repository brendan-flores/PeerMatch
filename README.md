# PeerMatch

PeerMatch is a full-stack campus marketplace that connects **clients** who need help with academic tasks to **freelancers** who can deliver that work. An **admin** panel supports moderation and user oversight.

Built for institutional use (e.g. `@cit.edu` email verification) with separate experiences for each role.

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Auth:** JWT sessions, Supabase Auth (email OTP)
- **Realtime:** Socket.IO
- **Deploy:** Vercel (web) · Render (API)

## Features

| Role | Highlights |
|------|------------|
| **Client** | Post tasks, review offers, hire freelancers, messaging, profile |
| **Freelancer** | Browse community feed, submit offers, messaging, public profile |
| **Admin** | Approve/decline posts, user management, dashboard metrics |

Shared: in-app notifications, offer workflow (pending → in progress → completed/rejected), mobile-friendly dashboards.

## Getting started

**Requirements:** Node.js 20+, MongoDB, Supabase project (email OTP)

```bash
git clone <repository-url>
cd PeerMatch
npm install
cp .env.example .env
```

Set at minimum in `.env`:

- `MONGODB_URI`
- `JWT_SECRET` (32+ characters)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
- `CORS_ORIGINS=http://localhost:3000`

See [.env.example](.env.example) and [docs/SUPABASE-AUTH-SETUP.md](docs/SUPABASE-AUTH-SETUP.md) for details.

```bash
npm run dev
```

| App | URL |
|-----|-----|
| Web (main + admin UI) | http://localhost:3000 |
| API | http://localhost:5000 |

Useful scripts: `npm run build` · `npm run seed:admin` · `npm run seed:tasks`

## Deployment

PeerMatch runs as two services:

1. **API** — deploy the `server/` app (e.g. Render) with MongoDB, JWT, Supabase, and CORS configured.
2. **Web** — deploy the Next.js app (e.g. Vercel) with `NEXT_PUBLIC_API_BASE_URL` pointing at your API.

Configure Supabase (site URL, redirects, email SMTP) for production sign-up.

Full checklists:

- [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md) — environment variables
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) — Vercel and admin domain setup
- [docs/SUPABASE-AUTH-SETUP.md](docs/SUPABASE-AUTH-SETUP.md) — email verification

After deploy, confirm `/api/health` on both the API and your public site, then test login and the main dashboards.

## Project layout

```
app/
  components/   Shared UI (client, freelancer, chat, dashboard)
  hooks/        Reusable React hooks
  lib/          Domain modules (api, auth, posts, chat, profile, …)
  admin/        Admin dashboard (separate host in production)
  api/          Next.js API routes (auth proxy, health, Render proxy)
server/
  routes/       Express routers
  controllers/  Route handlers
  services/     Business logic
  models/       Mongoose schemas
  scripts/      Seeds and one-off ops (seed:admin, promoteToAdmin, …)
docs/           Deployment and Supabase guides
public/
  branding/     Logos and brand images
  roles/        Client/freelancer role icons
scripts/        Asset tooling (e.g. process-brand-logo.mjs)
```

## License

Academic / course project — use and distribution per your institution’s policies.
