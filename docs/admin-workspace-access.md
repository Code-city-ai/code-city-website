# Admin workspace access

Confirmed scope on 2026-09-22: extend the existing Code City portal entrance with exactly two workspace choices, **ORC** and **Trade City**, each with its own fixed passcode. Preserve the public marketing site, existing CRM, and native applications. This is a narrow interface extension, not a new global design system.

## Routes and access rail

| Entry | Implemented behavior |
| --- | --- |
| `/admin` | Account sign-in when signed out; ORC and Trade City chooser after sign-in and profile verification. |
| `/sign-in`, `/admin/login`, `/admin/projects` | Aliases for the same chooser flow. `/admin/` and `/admin/projects/` are also recognized. |
| `/admin/set-password` | Existing authenticated password setup/recovery screen. |
| ORC selection | Checks the `orc` project, then exchanges the existing user session through same-origin `POST /orc/session` before navigating to `/orc/`. Failures remain on the access screen. |
| Trade City selection | Checks the `trade-city` project, then offers `/trade-city/` after unlock. |
| `/admin/overview` | Retained CRM overview behind the existing `code-city` project gate. Inquiries, clients, marketing, and settings retain their existing CRM routes and shell. |

`AdminAuthProvider` uses Supabase email/password sign-in. Password setup/reset requests return through `/admin/set-password`; they are separate from project passcodes. The chooser does not expose CRM as a third project tile.

`ProjectAccess` reuses the existing `projectAccess()` helper, which invokes the `project-workspace` Edge Function with an explicit project and one of `status`, `configure`, `unlock`, or `lock`. ORC and Trade City require an active owner/admin profile; the retained CRM gate also permits its existing agent/viewer roles. These are separate project grants under the same account session. Frontend rendering and local fixtures do not prove deployed authorization enforcement.

## Interface and states

The launcher inherits `admin.css`: dark background, cream text, Inter typography, and the existing Code City brand. Scoped rules in `project-access.css` provide two equal desktop tiles, stacked tiles below 700px, warm ORC and cool Trade City accents, visible keyboard focus, and reduced-motion handling. Both tiles are buttons with product icons and explicit project names.

The implemented access states cover loading, denied profile/role, unconfigured project, owner code setup/change, locked, unlocked, expired access, request failure/retry, and notification feedback. Owners set a fixed code of 10–128 characters; changing a configured code requires the current code and confirmation of the new one. Unlocking exposes the selected workspace link and lock action. Changing projects clears entered codes and feedback; returning to the chooser restores focus to the previous tile. Locked code inputs receive focus when ready. Sign-out ends the account session.

## Asset provenance

- Trade City uses `public/brands/trade-city-app.png`, copied unchanged from `TRADE-CITY/apps/macos/Resources/Assets.xcassets/AppIcon.appiconset/icon_256x256.png`. Both files have SHA-256 `9166e07691b414fadc43c43b97001a5150f3e94cdc2410d33e2c42e3baae1792`.
- ORC uses the existing blue gate icon in `public/brands/orc-app.png`, copied unchanged from PNG output extracted with `iconutil` from `CODE-CITY-AGENT-ORC/bin/appicon.icns`. The upstream restoration commit is `866cd7028e6f5c0d9e36f4cd9372edd9231e64e8`. The PNG has SHA-256 `9f08af8a9f6ed16bc3e1e31e16252a37e2b3bf1e6f63024416a13b36b0d998ff`; the source ICNS has SHA-256 `83d39009393d95f08d3c3ed369b09fd8fb4ecb6e92ba27751d6f82ed29732eb9`. The conductor SVG was removed. The installed Code City ORC application also shows the blue gate, but its lack of an embedded Git SHA means this visual match does not establish source freshness.
- No AI-generated raster imagery was introduced.

## Review evidence and limits

**Disposition: ship at the visual launcher scope after a fresh review of the corrected blue gate icon.** Capture paths are `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`; only refreshed captures showing the blue gate represent the current implementation. Captures use the local fixture banner and synthetic account. The implementation review covered `ProjectAccess.jsx`, `project-access.css`, `admin.css`, `Login.jsx`, `AdminApp.jsx`, `AdminShell.jsx`, and `src/admin/lib/project-access.js`.

The task's local CUA verification covered routing, focus return, and isolated project-code UI behavior using `scripts/verify-project-access.mjs`. The implementation handoff reports 75 JavaScript tests, 19 Python tests, and SQL checks passing; this documentation pass did not rerun those suites. Fixture interactions send no real email and do not open a live trading session.

Minor observations: Trade City requires scrolling on the captured mobile viewport, and notification-failure copy names Mailgun. The saved screenshots show a roughly 15px export bias; direct runtime measurements confirm equal 24px mobile margins and no horizontal overflow. This is a capture limitation, not a reason to alter the layout.

Cloud activation and real email delivery remain pending verification. Applying a database migration alone does not establish that the updated Edge Function, workspace destinations, real account recovery, project grants, or notification delivery work together in production. Complete deployment and verify the real account-to-workspace flow plus accepted/delivered email evidence before declaring the cloud entrance live. No production readiness claim is made here.

The ORC browser handoff validates its same-origin session response before navigation. A revoked-grant 403 clears the local unlocked state; other transport failures preserve it for retry. Four focused handoff tests and an independent source review passed. The final rendered revoked-grant retest is pending: Chrome blocked automation while an extension panel was open.
