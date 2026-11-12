# Tech Stack

## Overview

| Layer | Choice |
|---|---|
| **Frontend** | React + TypeScript, React Router, Vite (build tool) |
| **UI** | Tailwind CSS + shadcn/ui |
| **Backend** | Node.js + Express + TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Auth** | Better Auth: email + password, database-backed sessions (httpOnly cookie) |
| **Enrichment** | Apify API, called from the Express server |
| **Message drafting** | Claude API (Sonnet or Haiku model) |
| **Email** | SendGrid (Mail Send API) |
| **Deployment** | Docker + Railway |

## Architecture

```
React SPA (Vite)  --->  Express API  --->  PostgreSQL (via Prisma)
  React Router            |                  (users, sessions, app data)
  session cookie          +--->  Apify, Claude API, SendGrid
```

- The frontend is a single-page app. It talks only to the Express API. Login state is a session cookie that the browser sends automatically.
- The Express server is the only thing that touches the database and the third-party APIs. Secrets never reach the browser.
- Two separate repos: the frontend (`cc-outreach-fe`, this repo) and the backend (`cc-outreach-be`). Each has its own `package.json` and Railway service. They share an API contract (the backend publishes an OpenAPI spec; the frontend generates its types from it), not code.

## Frontend

- **React + TypeScript + Vite.** Plain SPA, no SSR needed for a single-user tool.
- **React Router** for the main views: daily tasks, weekly planning, companies, contacts, activity history.
- **No auth SDK.** The login page posts email and password to the API. The browser stores the session cookie, so every `fetch` uses `credentials: "include"`. The app learns who is logged in from `GET /auth/me`.
- **CSRF:** send a custom header (for example `X-Requested-With`) on every state-changing request. The API rejects mutations without it.
- **Data fetching:** TanStack Query is recommended for caching and refetching after a task is completed.
- **Tailwind + shadcn/ui** for forms, tables, and the task card.

## Backend

- **Express + TypeScript**, run with `tsx` in development and compiled with `tsc` for production.
- **Database sessions:**
  - A `User` table (email, password hash) and a `Session` table (hashed session token, user ID, created, last seen, expires).
  - On login, verify the password with argon2, generate a random token, store its SHA-256 hash in `Session`, and set the raw token in an httpOnly, Secure, SameSite cookie.
  - Auth middleware hashes the cookie value, looks up the session, rejects it if missing or expired, and extends the expiry (sliding window, for example 30 days).
  - Logout deletes the session row, so a stolen cookie stops working immediately. Delete expired rows periodically.
  - Rate-limit the login route.
- **Single-user lock:** there is no signup route. The one user is created by a seed script using env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- **Validation:** Zod on request bodies.
- **Apify webhooks:** an Express route receives run-complete callbacks (verify a shared secret). This route is outside session auth.
- **Scheduling:** none required. The daily and weekly views are computed from data (follow-ups with a `due_date` and `status`). If a job is needed later, use `node-cron` or a Railway cron service.

## Database and Prisma

- **PostgreSQL** with **Prisma** as the ORM and migration tool. Production uses a Railway Postgres service. Local development uses Postgres in Docker (`docker-compose.yml` in the backend repo).
- **One connection string:** `DATABASE_URL`, used at runtime and by `prisma migrate`. If a connection pooler is added later, add a separate `directUrl` for migrations.
- **Rules enforced in the database, not only in app code:**
  - Prisma enums for the contact, follow-up, and company statuses.
  - A partial unique index, added in a raw SQL migration, to allow only one `in_sequence` contact per company (Prisma can't express partial indexes in the schema).
  - Archive cascades run inside a `prisma.$transaction`.
- **No Row Level Security.** Only the Express server connects to the database, with its own credentials, and the database is not exposed to browsers.
- **Existing `all_contacts` table:** treated as a read-only source. It currently lives in Supabase, so copy it into the new Postgres once (dump and restore, or a one-off script) and pull from it via Prisma (`@@ignore`d model or `$queryRaw`) rather than migrating it.

## Auth flow

1. The browser posts email and password to `POST /api/auth/sign-in/email` (Better Auth).
2. The API verifies the password, creates a `Session` row, and sets the session cookie.
3. Each API call carries the cookie. The middleware looks up the session in Postgres and attaches the user to the request.
4. `POST /api/auth/sign-out` deletes the session row and clears the cookie.
5. **Cookies across two origins:** the `web` and `api` services are on different Railway hostnames, which browsers treat as different sites. Use a custom domain with both services as subdomains of it (for example `app.example.com` and `api.example.com`) so the cookie can be `SameSite=Lax`. Without a custom domain, the cookie would need `SameSite=None; Secure`, which browsers that block third-party cookies may reject.

## Integrations

- **Apify:** start an actor run from Express, then either poll or receive a webhook. Do not hold a request open for the run.
- **Claude API:** structured prompt from role, job post, my experience, sequence step, and prior messages to that contact. Short outputs (20–39 words for emails, up to 200 characters for LinkedIn requests). Every draft is reviewed and edited before use.
- **SendGrid:** SendGrid has no drafts, so the draft lives in the app (stored on the follow-up and edited in the draft editor). The app calls the Mail Send API only when you click send on a reviewed email.
  - Authenticate the sending domain (or a single sender) in SendGrid and set the `from` address to it. Set `reply_to` to the mailbox you read replies in.
  - Follow-ups set `In-Reply-To` and `References` headers using the stored message ID of the earlier email, so they thread in the recipient's inbox.
  - Replies go to your own mailbox, not SendGrid, so inbound replies are still logged by hand as before.
  - LinkedIn steps are still copy and paste.

## Docker and Railway

Docker builds the images and Railway runs them, so both repos are built and deployed as one pipeline.

- **Three Railway services:**
  - `api` (backend repo): multi-stage `Dockerfile` (install, `prisma generate`, `tsc`, then a slim runtime image). Run `prisma migrate deploy` as a pre-deploy command, not at container start.
  - `db`: Railway PostgreSQL. The `api` service reads its connection string through a Railway variable reference.
  - `web` (frontend repo): multi-stage `Dockerfile` that builds the Vite app and serves `dist` with a static server (for example nginx or `serve -s dist`) with an SPA fallback to `index.html` so React Router deep links work.
- **Local development:** each repo runs on its own. The backend repo's `docker-compose.yml` starts local Postgres; the frontend runs with `npm run dev` pointing `VITE_API_URL` at the local API.
- **Configuration:**
  - `api` env vars: `DATABASE_URL`, `SESSION_COOKIE_DOMAIN`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_REPLY_TO`, `APIFY_TOKEN`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed only), webhook secret, allowed web origin.
  - `web` build-time vars: `VITE_API_URL`.
- **CORS:** the API allows only the `web` service origin, with credentials enabled.

## Design decisions carried over

- The daily view is a query: pending follow-ups due today or earlier first, then `new` contacts until the 10-email goal is met.
- Variant tags are dropped from V1.
