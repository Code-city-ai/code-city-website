# Private proposals

`/admin/proposals` keeps client proposal PDFs inside the Code City portal, behind the account sign-in and the existing CRM project gate.

## Access

- Owners and admins only (`public.can_manage_code_city()`). Agents and viewers get no nav item and a locked message; the database and storage policies enforce the same rule, so the frontend check is not the boundary.
- Rows live in `public.proposals` (forced RLS). Files live in the private Storage bucket `proposals` (PDF only, 25 MB each).
- Viewing uses 10-minute signed URLs. **Copy 7-day link** creates a 7-day signed URL for sending one PDF to a prospect; it stops working after 7 days.

## Use

**New** → title, client, optional summary, and an English and/or Chinese PDF. The page uploads the files, then records their paths on the row; if any upload fails, the uploaded files and the row are removed.

## Deploy

1. Apply `supabase/migrations/20261014120000_private_proposals.sql` to project `yfpcjxkyjftkekwkekrz` through the owner's signed-in Supabase dashboard (see `AGENTS.md`; no CLI login or stored tokens).
2. The frontend ships with `main` through Vercel.

## Local check

`node scripts/verify-proposals.mjs` serves the page against a local fake backend (no real account, database or storage). `FIXTURE_ROLE=agent` shows the locked state; `FIXTURE_PROPOSAL_EN` / `FIXTURE_PROPOSAL_ZH` point it at real PDFs.
