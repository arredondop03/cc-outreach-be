# Backend Implementation Plan (for the `cc-outreach-be` repo)

Move this file into the backend repo when you create it. It holds every API, database, and integration task split out of the original combined plan. The frontend plan is `implementation-plan.md` in the FE repo. Phase numbers match the frontend plan so the two can be worked in parallel. Phase 0 decisions are in the frontend plan. Updated for the revised `tech-stack.md`: plain Postgres, email/password database sessions, and SendGrid (no Supabase or Gmail).

## Phase 1: Project skeleton

- [x] 1.1 Init the repo with a `.gitignore` and `.env.example`.
- [x] 1.2 Scaffold Express + TypeScript, `tsx` for dev, `tsc` build.
- [x] 1.3 Add env loading and validation (Zod), failing fast on missing variables.
- [x] 1.4 Add an error-handling middleware and request logging.
- [x] 1.5 Write a multi-stage Dockerfile, and a `docker-compose.yml` if wanted for local dev.
- [x] 1.6 Set up OpenAPI generation (for example `zod-to-openapi`) and serve the spec at `/openapi.json`, so the frontend can generate types.

**Done when:** the server runs locally and in Docker, and `/openapi.json` is served.

## Phase 2: Database and schema

- [ ] 2.1 Add a `postgres` service (with a named volume) to `docker-compose.yml` for local dev. Install Prisma with a single `DATABASE_URL` and add it to `src/env.ts` and `.env.example`. Confirm it connects.
- [ ] 2.2 Model `User` (email unique, password hash) and `Session` (hashed token unique, user ID, created, last seen, expires; index on expiry).
- [ ] 2.3 Model `Company`: LinkedIn URL, name, status enum (`new`, `ready_for_sequence`, `active`, `archived`), enrichment fields.
- [ ] 2.4 Model `Contact`: company, name, role, email, LinkedIn URL, status enum (`new`, `in_sequence`, `engaged`, `done`, `never_contacted`), source.
- [ ] 2.5 Model `FollowUp`: contact, step number, channel, `due_date`, status enum (`pending`, `completed`, `wont_do`), plus draft `subject` and `body` (SendGrid has no drafts, so the draft lives here).
- [ ] 2.6 Model `Interaction`: contact, direction (inbound/outbound), channel, body, timestamp, optional link to the follow-up. Add nullable `messageId` (the RFC `Message-ID` of a sent email) for threading, and `sendgridMessageId` if useful for debugging.
- [ ] 2.7 Run the first migration.
- [ ] 2.8 Raw SQL migration for a partial unique index: one `in_sequence` contact per company.
- [ ] 2.9 Update the `Dockerfile` build stage to run `prisma generate` (and copy `prisma/` and the generated client into the runtime image).
- [ ] 2.10 Seed script: create the single admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (argon2 hash, idempotent), plus a few sample companies, contacts, and follow-ups in development only.
- [ ] 2.11 One-off copy of `all_contacts` from Supabase into the new Postgres (`pg_dump` / `pg_restore` of that table, documented in the README). Then read access via `$queryRaw` or an `@@ignore`d model.

**Done when:** migrations apply cleanly to a fresh local database, and the seed script runs.

## Phase 3: Authentication (Better Auth, database sessions)

- [x] 3.1 Install `better-auth`; add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` to `src/env.ts` and `.env.example`.
- [x] 3.2 `src/lib/auth.ts`: Prisma adapter, email/password enabled, sign-up disabled, DB-backed sessions. Mounted at `/api/auth/*` before `express.json()`.
- [ ] 3.3 Generate auth models and run the migration (`npx auth@latest generate --config src/lib/auth.ts`, `npx prisma migrate dev`).
- [ ] 3.4 `npm run seed:admin` creates the single admin user (`scripts/seed-admin.ts`).
- [x] 3.5 CORS limited to `FRONTEND_ORIGIN` with `credentials: true`; Better Auth checks `trustedOrigins` for CSRF.
- [x] 3.6 `requireAuth` middleware (`src/middleware/requireAuth.ts`). Mount it on everything except `/health`, `/api/auth/*`, and the Apify webhook. (`/openapi.json` is also behind it.)
- [x] 3.7 Auth endpoints documented in `src/openapi.ts` via `src/routes/auth.ts`.
- [ ] 3.8 Verify: wrong password, sign-up disabled, sign-out invalidates the session, no cookie gets 401 from `requireAuth`. (Login is limited to 5 attempts per minute via `rateLimit` in `src/lib/auth.ts`; also confirm the 6th attempt returns 429.)

**Done when:** the API refuses everything except requests carrying your valid session cookie.

## Phase 4: Companies and contacts CRUD

- [ ] 4.1 Zod schemas and routes to create, read, update, and delete companies.
- [ ] 4.2 The same for contacts, scoped by company.
- [ ] 4.3 Company status rules (`ready_for_sequence` when a contact is `new`, `active` when one is `in_sequence`), as a single function used by every route that changes contacts.
- [ ] 4.4 Archive a company inside one transaction: contacts to `done` or `never_contacted`, pending follow-ups to `completed` or `wont_do`.
- [ ] 4.5 Tests for the status rules and the archive cascade.
- [ ] 4.6 List endpoint for companies with status filter and search.

**Done when:** the company and contact endpoints work and archiving behaves as the scope describes.

## Phase 5: Enrichment

- [ ] 5.1 Apify client wrapper that starts a run and returns the run ID.
- [ ] 5.2 Store enrichment runs (type, target, status, result reference).
- [ ] 5.3 Webhook route for run-complete callbacks, with shared-secret verification. Mount it outside session auth.
- [ ] 5.4 Mapper from the company actor output to a `Company` record. Fill in the company on callback.
- [ ] 5.5 Find contacts for a company, first from `all_contacts`, then via an Apify actor if none.
- [ ] 5.6 Mapper from contact results to `Contact` records, with duplicate detection (email or LinkedIn URL).
- [ ] 5.7 Handle failed or timed-out runs: record the error and allow retry.

**Done when:** a LinkedIn URL produces an enriched company, and contacts can be pulled in and chosen.

## Phase 6: Sequence engine

The core logic. Keep it in one module with no HTTP in it, so it is easy to test.

- [ ] 6.1 Business-day helper (add N business days), skipping weekends and holidays. Holidays: 2026-11-26, 2026-11-27, 2026-12-24, 2026-12-25, 2026-12-31, 2027-01-01, 2027-01-18, kept in an easy-to-extend config list. Pick a date library or hand-roll it.
- [ ] 6.2 Define the five-step sequence as data: step number, channel, and offset from the previous step (3 business days).
- [ ] 6.3 Start a sequence: allowed only if the company has no `in_sequence` contact. Set the contact to `in_sequence`, and create the first follow-up for today (or a chosen date).
- [ ] 6.4 Complete a follow-up: mark it `completed`, log the interaction, and create the next step three business days out.
- [ ] 6.5 Finish the sequence: after the breakup email and a 3-business-day waiting period, set the contact to `done` and update the company status.
- [ ] 6.6 Mark a contact `engaged`: delete the next pending follow-up, set the status, and keep logging allowed.
- [ ] 6.7 Mark a follow-up `wont_do`. Overdue follow-ups stay `pending`.
- [ ] 6.8 "Asked not to be contacted": contact to `done`, pending follow-ups cleared.
- [ ] 6.9 Wrap every operation above in a transaction.
- [ ] 6.10 Unit tests: happy path, one contact per company, engaged mid-sequence, weekend and holiday spacing, breakup waiting period.
- [ ] 6.11 API routes for starting a sequence, completing and skipping a step, and marking engaged.

**Done when:** tests cover the scope's rules, and a sequence can be driven end to end through the API.

## Phase 7: Message drafting

- [ ] 7.1 Claude client wrapper with the model, timeout, and error handling.
- [ ] 7.2 Prompt inputs: contact role, job post, your experience, step, prior messages to this contact.
- [ ] 7.3 Experience summary stored as a single settings row, with get and update routes.
- [ ] 7.4 One prompt template per step type (initial, follow-up, breakup, LinkedIn request, call notes).
- [ ] 7.5 Enforce length limits: validate the output and retry once if outside 20–39 words (email) or over 200 characters (LinkedIn).
- [ ] 7.6 Job post field on the company or contact.
- [ ] 7.7 Generate-draft route that returns the draft and saves it on the follow-up as an unsent draft.
- [ ] 7.8 Tune prompts against a handful of real contacts.

**Done when:** each step type produces a draft within the length limits.

## Phase 8: Sending email with SendGrid

- [ ] 8.1 Add `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_REPLY_TO` to `src/env.ts` and `.env.example`. Authenticate the sending domain (or a single sender) in SendGrid.
- [ ] 8.2 SendGrid client wrapper around the Mail Send API, with timeout and error mapping.
- [ ] 8.3 Draft storage routes: save and edit the draft `subject` / `body` on a follow-up (nothing is sent).
- [ ] 8.4 Send route: sends the reviewed draft, then calls the sequence engine's complete-follow-up function (6.4) in the same flow, so the follow-up is completed, the outbound interaction is logged with its message ID, and the next step is scheduled. Do not log separately. Guard against double-sends (refuse if the follow-up is already completed).
- [ ] 8.5 Threading: for follow-ups, set `In-Reply-To` and `References` from the stored `messageId` of the earlier emails, and reuse the subject with `Re:`. Set our own `Message-ID` header so we know it without a webhook.
- [ ] 8.6 Return distinct errors for SendGrid failures (unauthenticated sender, rejected, rate limit) so the frontend can show them.
- [ ] 8.7 Until a real sending domain exists, use `parredondo2724@gmail.com` as the SendGrid sender, reply-to, and test recipient (set in `.env`). Send a test email and confirm threading in that mailbox.

**Done when:** a reviewed email sends from the app, and follow-ups thread under the first email.

## Phase 9: Daily task view

- [ ] 9.1 Query for today's list. Pending follow-ups due today or overdue first, then `new` contacts for initial emails until the daily goal is met.
- [ ] 9.2 "Next task" endpoint returning the first item and the counts (done today, remaining, goal).
- [ ] 9.3 "Complete task" for LinkedIn tasks (the "next" click): runs the same sequence-engine completion as 8.4, logs the interaction, and returns the next task. Email tasks are completed by the send route in 8.4, which also returns the next task.
- [ ] 9.4 Never pick two new contacts from the same company.

**Done when:** the API can drive a whole weekday of tasks.

## Phase 10: Weekly planning

- [ ] 10.1 For next week, per day, the follow-ups scheduled.
- [ ] 10.2 Per day, the number of `new` enriched contacts available versus the goal, and the shortfall.
- [ ] 10.3 Companies whose contact finished the last step and need a new contact selected. The pick itself reuses the contact routes (4.2) and 10.4, so the view can do it inline.
- [ ] 10.4 Starting a sequence for a chosen future date.

## Phase 11: Activity logging

- [ ] 11.1 List interactions for a contact or company, newest first.
- [ ] 11.2 Manual inbound and outbound logging as two separate routes.
- [ ] 11.3 Logging an inbound reply offers (or triggers) the move to `engaged`.

## Phase 12: Deploy to Railway

- [ ] 12.1 Create the Railway project with a `db` (PostgreSQL) service and an `api` service built from this repo's `Dockerfile`.
- [ ] 12.2 Set `api` environment variables: `DATABASE_URL` (variable reference to `db`), `SESSION_COOKIE_DOMAIN`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_REPLY_TO`, `APIFY_TOKEN`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed only), webhook secret, `FRONTEND_ORIGIN`.
- [ ] 12.3 Add `prisma migrate deploy` as the pre-deploy command.
- [ ] 12.4 Restore the `all_contacts` copy into the Railway database and run the admin seed once.
- [ ] 12.5 Buy or use a custom domain and attach both services as subdomains (`api.` and `app.`), so the cookie is first-party and `SameSite=Lax` works. Set `SESSION_COOKIE_DOMAIN` and the CORS origin accordingly.
- [ ] 12.6 Point the Apify webhook at the deployed API.
- [ ] 12.7 Back up the database (Railway backups or a periodic `pg_dump`).
- [ ] 12.8 Behind Railway's proxy, set `app.set('trust proxy', 1)` in `src/app.ts`, and set `advanced.ipAddress.ipAddressHeaders` in `src/lib/auth.ts` to the header Railway's proxy always overwrites (confirm which one in Railway's docs), so the login rate limit can't be dodged with a spoofed `X-Forwarded-For`. Verify the deployed API logs the real client IP and that the 6th sign-in attempt in a minute returns 429.

## Phase 13: Hardening

- [ ] 13.1 Rate-limit the rest of the API (login is already limited in 3.7), and review request-size limits.
- [ ] 13.2 Error reporting or structured logs.
- [ ] 13.3 README: setup, environment variables, deploy steps.
