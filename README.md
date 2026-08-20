# Code City website

The production Code City marketing site. The frontend is a lightweight React and Vite application deployed through Vercel. Supabase owns the secure project-inquiry backend.

## Architecture

- **Frontend:** React, Vite, Framer Motion, and purpose-built CSS
- **Publishing:** Vercel from the `main` branch of the GitHub repository
- **Backend:** Supabase Postgres and the `submit-inquiry` Edge Function
- **Data boundary:** browsers cannot read or write the inquiry table directly; the Edge Function validates, rate-limits, and writes with server-only credentials

## Local development

Copy `.env.example` to `.env.local` and supply the public Supabase project URL and publishable anon key. Then use the package scripts for development, linting, type checks, and production builds.

## Portfolio previews

`npm run capture:portfolio` captures deterministic website previews into `public/portfolio`. A recurring Code City portfolio automation refreshes the previews every Monday and publishes only when a captured preview actually changes.

## Supabase

Database changes live in `supabase/migrations`. The public inquiry endpoint lives in `supabase/functions/submit-inquiry`. The function expects `ALLOWED_ORIGINS` as a comma-separated allowlist and may use `RATE_LIMIT_SALT` to create non-reversible client-address hashes.

## Deployment

Vercel reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's Production and Preview environment variables. The canonical production domain is `https://codecity.ai`; `https://www.codecity.ai` permanently redirects to it.
