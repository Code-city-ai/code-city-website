# Code City website

The production Code City marketing site. The frontend is a lightweight React and Vite application deployed through Vercel. Supabase owns the secure project-inquiry backend.

## Architecture

- **Frontend:** React, Vite, Framer Motion, and purpose-built CSS
- **Publishing:** Vercel from the `main` branch of the GitHub repository
- **Backend:** Supabase Postgres, the `submit-inquiry` and `process-inquiry-notifications` Edge Functions, and a Vercel Python first-party tracking function
- **Data boundary:** browsers cannot read or write the inquiry table directly; the Edge Function validates, rate-limits, and writes with server-only credentials
- **Private workspace:** Supabase Auth and row-level security protect the Code City client and marketing operations portal under `/admin`

## Local development

Copy `.env.example` to `.env.local` and supply the public Supabase project URL and publishable anon key. Then use the package scripts for development, linting, type checks, and production builds.

## Portfolio previews

`npm run capture:portfolio` captures deterministic website previews into `public/portfolio`. A recurring Code City portfolio automation refreshes the previews every Monday and publishes only when a captured preview actually changes.

## Supabase

Database changes live in `supabase/migrations`. The public inquiry endpoint lives in `supabase/functions/submit-inquiry`. It validates and stores each inquiry together with an atomic two-recipient notification outbox, then makes a best-effort immediate delivery attempt without making email availability the customer's storage boundary. `supabase/functions/process-inquiry-notifications` is the scheduled retry worker. Both functions use the same sender implementation and the database permits notification rows only for `dev@codecity.ai` and `aytamzid@airdropja.com`.

The Edge Functions expect `ALLOWED_ORIGINS` as a comma-separated allowlist and may use `RATE_LIMIT_SALT` to create non-reversible client-address hashes. Mailgun delivery is intentionally server-only and is enabled by setting `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`; `MAILGUN_API_BASE` is optional and restricted to Mailgun's US or EU API host. The scheduled worker authenticates with a dedicated Supabase secret API key named `code-city-notifications`. Store only that key's value in Supabase Vault as `code_city_notifications_secret_key`, then run `public.reconcile_inquiry_notification_worker_schedule()` as the service role. Never use a service-role JWT as the worker's scheduled HTTP credential.

The first-party event endpoint is `api/track.py`. It validates a narrow event vocabulary, strips unknown properties, hashes client addresses with `TRACKING_HASH_SALT`, and writes through a server-only Supabase service role. Raw client addresses are never stored.

## Deployment

Vercel reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's Production and Preview environment variables. The Python tracking function additionally requires production-scoped `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRACKING_HASH_SALT`, and `ALLOWED_ORIGINS`. The canonical production domain is `https://codecity.ai`; `https://www.codecity.ai` permanently redirects to it.
