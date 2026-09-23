# Admin workspace access

Confirmed scope on 2026-09-22: extend the existing Code City portal entrance with exactly two workspace choices, **ORC** and **Trade City**, each with its own fixed passcode. Preserve the public marketing site, existing CRM, and native applications. This is a narrow interface extension, not a new global design system.

## Routes and access rail

| Entry | Implemented behavior |
| --- | --- |
| `/admin` | Account sign-in when signed out; ORC and Trade City chooser after sign-in and profile verification. |
| `/sign-in`, `/admin/login`, `/admin/projects` | Aliases for the same chooser flow. `/admin/` and `/admin/projects/` are also recognized. |
| `/admin/set-password` | Existing authenticated password setup/recovery screen. |
| ORC selection | Checks the `orc` project, then attempts to exchange the existing user session through same-origin `POST /orc/session` before navigating to `/orc/`. Failures remain on the access screen. |
| Trade City selection | Checks the `trade-city` project, then offers `/trade-city/` after unlock. |
| `/admin/overview` | Retained CRM overview behind the existing `code-city` project gate. Inquiries, clients, marketing, and settings retain their existing CRM routes and shell. |

The ORC link and grant UI exist, but the cloud runtime and `/orc/session` endpoint are not deployed yet; the chooser is not a verified working ORC entry.

`AdminAuthProvider` uses Supabase email/password sign-in. Password setup/reset requests return through `/admin/set-password`; they are separate from project passcodes. The chooser does not expose CRM as a third project tile.

`ProjectAccess` reuses the existing `projectAccess()` helper, which invokes the `project-workspace` Edge Function with an explicit project and one of `status`, `configure`, `unlock`, or `lock`. ORC and Trade City require an active owner/admin profile; the retained CRM gate also permits its existing agent/viewer roles. These are separate project grants under the same account session. Frontend rendering and local fixtures do not prove deployed authorization enforcement.

## Interface and states

The launcher inherits `admin.css`: dark background, cream text, Inter typography, and the existing Code City brand. Scoped rules in `project-access.css` provide two equal desktop tiles, stacked tiles below 700px, warm ORC and cool Trade City accents, visible keyboard focus, and reduced-motion handling. Both tiles are buttons with product icons and explicit project names.

The implemented access states cover loading, denied profile/role, unconfigured project, owner code setup/change, locked, unlocked, expired access, request failure/retry, and notification feedback. Owners set a fixed code of 10–128 characters; changing a configured code requires the current code and confirmation of the new one. Unlocking exposes the selected workspace link and lock action. Changing projects clears entered codes and feedback; returning to the chooser restores focus to the previous tile. Locked code inputs receive focus when ready. Sign-out ends the account session.

## Asset provenance

- Trade City uses `public/brands/trade-city-app.png`, copied byte-for-byte from `TRADE-CITY/apps/macos/Resources/Assets.xcassets/AppIcon.appiconset/icon_256x256.png` at accepted build-325 source commit `149a2eaaa1de4eb1a5c54f5361f8d6108aead105`. Both files have SHA-256 `d9d242605aaf1cfd26d78937f76da98a22c004fed62fea418acac7e0c180334a`. The installed `/Applications/TradeCity.app/Contents/Info.plist` reports `CFBundleVersion=325` and the same `TradeCityGitSHA`; the 256px image extracted from its `AppIcon.icns` is pixel-identical to the source PNG. The chooser image is pinned to this accepted build-325 asset, not a moving main-branch icon.
- ORC uses `public/brands/orc-app.png`, generated from the checked-in `CODE-CITY-AGENT-ORC/orc_desktop_icon.py:draw_icon` for the dedicated `ORC Orchestra.app`. The generator was verified unchanged against ORC `origin/main` at `25d20953eedb5e3caa294e46891d2ba72a3f79fb`; its last source change was `44214078a08ed488df23c265f1510efa249fe97d`. The 1024px source output was scaled to 256px with `sips -Z 256`; the shipped PNG has SHA-256 `0588b5d6d4c930a37e25c43df940d305f5ec4b2d761a56a560876ee8c479913d`. The former blue gate came from `bin/appicon.icns` for the separate Code City desktop launcher and was not the dedicated ORC Orchestra mark.
- No AI-generated raster imagery was introduced.

## Review evidence and limits

**Disposition: ORC asset corrected; Trade City tile updated to accepted installed build 325; production verification remains.** The prior signed-in `scripts/verify-project-access.mjs` fixture showed the new ORC Orchestra icon beside the then-current Trade City build-324 icon. The build-325 replacement has been visually inspected as an image and still needs a rendered chooser check. Earlier captures at `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png` show the former blue gate and do not represent the new icons. The sign-in signature and project chooser share their asset paths. The previous implementation review covered `ProjectAccess.jsx`, `project-access.css`, `admin.css`, `Login.jsx`, `AdminApp.jsx`, `AdminShell.jsx`, and `src/admin/lib/project-access.js`.

The task's earlier local CUA verification covered routing, focus return, and isolated project-code UI behavior using `scripts/verify-project-access.mjs`. For the build-325 tile update, 84 JavaScript tests, 19 Python tests, the Vite production build, ESLint, and the TypeScript check passed. Fixture interactions send no real email and do not open a live trading session.

Minor observations: Trade City requires scrolling on the captured mobile viewport, and notification-failure copy names Mailgun. The saved screenshots show a roughly 15px export bias; direct runtime measurements confirm equal 24px mobile margins and no horizontal overflow. This is a capture limitation, not a reason to alter the layout.

Cloud activation and real email delivery remain pending verification. Applying a database migration alone does not establish that the updated Edge Function, workspace destinations, real account recovery, project grants, or notification delivery work together in production. Complete deployment and verify the real account-to-workspace flow plus accepted/delivered email evidence before declaring the cloud entrance live. No production readiness claim is made here.

The ORC browser handoff validates its same-origin session response before navigation. A revoked-grant 403 clears the local unlocked state; other transport failures preserve it for retry. Four focused handoff tests and an independent source review passed. The final rendered revoked-grant retest is pending: Chrome blocked automation while an extension panel was open.
