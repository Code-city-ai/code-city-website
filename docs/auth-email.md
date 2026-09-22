# Code City Auth email via Mailgun

This is the Supabase **Send Email Auth Hook** for the Code City website project
`yfpcjxkyjftkekwkekrz`. It reuses `getMailgunConfig()` and the existing Mailgun
server secrets. Inquiry notifications and project-unlock notices remain separate
flows. No Auth identity, password, or project passcode is created by this hook.

## Production configuration

1. Deploy `supabase/functions/auth-email` to the Code City project. Its gateway
   `verify_jwt` setting is **false**: the handler verifies the exact raw request
   using pinned `standardwebhooks@1.0.0` and timestamp validation instead.
2. The owner configures **Authentication → Hooks → Send Email → Signing secret**
   for the HTTPS hook URL
   `https://yfpcjxkyjftkekwkekrz.supabase.co/functions/v1/auth-email`.
   The owner stores the matching value, in its dashboard format
   `v1,whsec_<base64>`, as the Edge Function secret `SEND_EMAIL_HOOK_SECRET`.
   Reuse a valid existing configuration; deployment is not permission to generate,
   rotate, reveal, or transfer a private key. If either field is missing, the
   owner must complete that private configuration before activation.
   Keep it exclusively in Supabase secret configuration. This is a distinct key;
   **never reuse `MAILGUN_WEBHOOK_SIGNING_KEY`** or put keys in browser variables,
   source, screenshots, logs, or deployment notes.
3. Retain existing `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`.
   `MAILGUN_API_BASE` is optional (default `https://api.mailgun.net`; the shared
   config also permits `https://api.eu.mailgun.net`). The sender must belong to
   the verified sending domain. The platform supplies `SUPABASE_URL`; the handler
   rejects any project other than the Code City project above.
4. Only after the owner completes the matching secret configuration, activate the
   Send Email hook and keep the Email provider enabled. The hook
   replaces built-in SMTP delivery; it does not require enabling a second SMTP
   path. Keep Site URL `https://codecity.ai` and the exact redirect allowlist entry
   `https://codecity.ai/admin/set-password`. Add another exact first-party redirect
   only if its corresponding Auth flow is deliberately enabled.

Recovery and invite emails always return to `/admin/set-password`, where the
existing password setup screen accepts the Supabase session. The other supported
actions are signup, magiclink, and email_change. Their redirects must use the
exact HTTPS `codecity.ai` origin and one of `/`, `/sign-in`, `/admin`,
`/admin/set-password`, or `/trade-city/`, without credentials, query, or fragment.
An omitted redirect defaults to `/sign-in`. Payload `site_url` is never trusted.

Secure email change sends both confirmations with Supabase's documented hash
mapping: `token_hash_new` to the current email, `token_hash` to the new email.
With secure email change disabled, only the new email receives `token_hash`.
Every message uses a one-time verification link; raw OTPs, passwords, and fixed
project passcodes are never rendered. Mailgun open/click tracking is disabled.

Other action types (including reauthentication and optional security-notification
emails) fail explicitly with 422. Do not enable those email flows until they have
a reviewed message implementation. Invalid signatures return 401, invalid bodies
400/413/415, missing configuration 503, and Mailgun failure 502. Errors contain no
provider responses or credentials. Requests are capped at 64 KiB; Mailgun calls
share a four-second deadline. A successful 200 means Mailgun accepted every
required message, not that an inbox has received it. Provider retries can deliver
duplicate copies of the same one-time link; this hook does not claim exactly-once
email delivery.

The read-only production preflight on 2026-09-22 found Email enabled, secure
email change enabled, secure password change disabled, and all seven optional
security email notifications disabled. None of those settings were changed.
Recheck them at activation; this snapshot is not a claim that the hook is live.

## Verification before declaring live

1. Run `node --test tests/js/auth-email.test.js tests/js/project-workspace.test.js`
   and Deno-check the deployed entries.
   These tests use synthetic signing keys and mock Mailgun; they send no email.
2. Read back the deployed source/version. An unsigned call must not send mail:
   expect 401 with configured signing, or 503 while signing is absent. A
   fail-closed 503 proves denial, not successful activation or email delivery.
3. Preserve the existing signed-in account at `https://codecity.ai/sign-in`.
   If no application session exists, the owner signs in normally. Do not request
   a password reset, create an account, change a password, or extract a session
   token as a deployment check. Existing recovery/invite behavior remains
   supported and covered by synthetic tests; this task does not activate it.
4. Through the existing project chooser, the owner privately sets a missing
   ORC/Trade City code or enters its existing code. Never supply a default code
   or copy it into tools, logs, storage, or notes. Successful unlock requires
   Mailgun acceptance and a server-side user/session/project-scoped grant.
   Verify expiry, lock, wrong-code and cross-project/user/session denials in
   isolated tests; do not rotate a live code or exhaust a user's retry budget.
5. A real email proof requires a separately owner-approved existing Auth event.
   Record accepted/delivered event timestamps and redacted message IDs only,
   never verification links, raw payloads, credentials, or private inbox text.
   No synthetic test, deployed source, or unsigned denial proves delivery.
6. If activation remains incomplete, name only the exact missing field:
   **Authentication → Hooks → Send Email → Signing secret** and matching
   **Edge Functions → Secrets → SEND_EMAIL_HOOK_SECRET**, or the existing
   Mailgun sender/domain activation. Leave the hook fail-closed and preserve
   existing Auth, public-site and inquiry-notification behavior.

Source references: [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook),
[Supabase Auth email example](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend),
[Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks).
