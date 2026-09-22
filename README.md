# Code City website

The production Code City marketing site. The frontend is a lightweight React and Vite application deployed through Vercel. Supabase owns the secure project-inquiry backend.

## Architecture

- **Frontend:** React, Vite, Framer Motion, and purpose-built CSS
- **Publishing:** Vercel from the `main` branch of the GitHub repository
- **Backend:** Supabase Postgres, the `submit-inquiry`, `process-inquiry-notifications`, and `mailgun-webhook` Edge Functions, and a Vercel Python first-party tracking function
- **Data boundary:** browsers cannot read or write the inquiry table directly; the Edge Function validates, rate-limits, and writes with server-only credentials
- **Private workspace:** Supabase Auth and row-level security protect the Code City client and marketing operations portal under `/admin`

## Local development

Copy `.env.example` to `.env.local` and supply the public Supabase project URL and publishable key. The established `VITE_SUPABASE_ANON_KEY` variable name is retained for deployment compatibility even when its value uses the newer `sb_publishable_...` format. Then use the package scripts for development, linting, type checks, and production builds.

## Portfolio previews

`npm run capture:portfolio` captures deterministic website previews into `public/portfolio`. A recurring Code City portfolio automation refreshes the previews every Monday and publishes only when a captured preview actually changes.

## Supabase

Database changes live in `supabase/migrations`. The public inquiry endpoint lives in `supabase/functions/submit-inquiry`. It validates and stores each inquiry together with an atomic two-recipient notification outbox, then makes a best-effort immediate delivery attempt without making email availability the customer's storage boundary. `supabase/functions/process-inquiry-notifications` is the scheduled retry worker. Both functions use the same sender implementation and the database permits notification rows only for `dev@codecity.ai` and `aytamzid@airdropja.com`.

The public inquiry function accepts the project's publishable key in the `apikey` header, validates it inside `@supabase/server`, and deliberately keeps the legacy gateway JWT check disabled; a publishable key must never be sent as an `Authorization` bearer token. The Edge Functions expect `ALLOWED_ORIGINS` as a comma-separated allowlist and may use `RATE_LIMIT_SALT` to create non-reversible client-address hashes. Mailgun delivery is intentionally server-only and is enabled by setting `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`; `MAILGUN_API_BASE` is optional and restricted to Mailgun's US or EU API host. The scheduled worker authenticates with a dedicated Supabase secret API key named `code_city_notifications`, following Supabase's lowercase letters, digits, and underscore naming rule. Store only that key's value in Supabase Vault as `code_city_notifications_secret_key`, then run `public.reconcile_inquiry_notification_worker_schedule()` as the service role. Never use a service-role JWT as the worker's scheduled HTTP credential.

`mailgun-webhook` reconciles provider delivery evidence back into the existing two-recipient outbox. Configure domain-level webhooks for `accepted`, `delivered`, `temporary_fail`, and `permanent_fail`, all targeting the deployed Edge Function. Store Mailgun's HTTP Webhook Signing Key in the server-only `MAILGUN_WEBHOOK_SIGNING_KEY` secret. This signing key is distinct from `MAILGUN_API_KEY` and must never be exposed to the frontend. The function verifies the signed request, normalizes only the delivery metadata needed for reconciliation, and stores a replay-safe token hash; raw webhook payloads and signatures are never retained.

The first-party event endpoint is `api/track.py`. It validates a narrow event vocabulary, strips unknown properties, hashes client addresses with `TRACKING_HASH_SALT`, and writes through a server-only Supabase service role. Raw client addresses are never stored.

## Deployment

Vercel reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's Production and Preview environment variables. The Python tracking function additionally requires production-scoped `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRACKING_HASH_SALT`, and `ALLOWED_ORIGINS`. The canonical production domain is `https://codecity.ai`; `https://www.codecity.ai` permanently redirects to it.

## Private project workspace / Trade City

`/sign-in` reuses the existing Supabase administrator account. Active `owner` and `admin` profiles can enter the project workspace after a second, owner-set fixed code. `/admin/projects` is the project launcher, `/admin/projects/trade-city` is the reporting dashboard, and `/admin/projects/access` lets an existing owner set or rotate the code. Existing client-operations routes under `/admin` retain their current authorization and behavior. This is a separate project-access grant, not a second identity provider or a replacement for the administrator password.

Deploy `20260922160000_project_workspace.sql` and the `project-workspace` Edge Function before publishing this frontend. The function explicitly validates the exact user bearer JWT through `auth.getUser`, looks up the active admin profile, and binds a one-hour grant to the verified JWT's session ID and current code revision. Password codes are PBKDF2-SHA256 hashed with a random salt and 600,000 iterations. Only the service role can access the code, grant and attempt tables; an atomic database bucket limits code attempts to five per 15 minutes per administrator, including setup/rotation. All reads are also rate-limited. Code rotation invalidates every previous grant. Sign-out attempts to revoke the current grant; a later login has a different session ID regardless.

Configure `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM` and optionally `MAILGUN_API_BASE` using the existing server-only Mailgun setup. Successful unlocks must first be accepted by Mailgun for delivery to `dev@codecity.ai`; a Mailgun failure leaves access locked. Provider acceptance is not a claim of delivered email. The fixed code is never emailed or returned by the server. A code change remains saved if its notification fails, and the UI reports that distinction.

The reporting connection needs server-only `TRADECITY_WEB_BACKEND_URL` (an HTTPS origin, no path) and `TRADECITY_WEB_READ_TOKEN` (the existing backend credential authorized to read the required endpoints). The proxy has no arbitrary URL or HTTP-method input and permits only `GET /positions/pnl` with price refresh disabled, `GET /analytics/performance`, and `GET /ai/nova/status`. It does not arm autonomy or submit orders. Select the owner-approved runtime: the repository's Cloud Run service is a paper/control-plane preview, not evidence of the Mac-local broker runtime. The UI labels paper reports and renders missing/partial pricing and cost evidence explicitly. It never substitutes demonstration balances for an unavailable account.

First-time provisioning uses the existing Supabase Auth identity and matching active `admin_profiles` row with role `owner`; no public sign-up or automatic owner escalation is introduced. Once provisioned, the owner signs in and sets the fixed code in the browser. No fixed code belongs in this repository, deployment environment, chat, or Vite bundle.

Validation: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npx deno check --node-modules-dir=none supabase/functions/project-workspace/index.ts`. `node scripts/verify-project-workspace.mjs` runs a localhost-only visual fixture (ports 4173/54421) with an explicit synthetic-data banner and no real emails, secrets or trades. It is never part of the production bundle. The fixture accepts `owner@example.test`, any test password and `fixture-code-only`; it deliberately returns an unavailable-backend state for Kraken. Security behavior is exercised separately by the dependency-injected function tests, not established by the visual fixture.
