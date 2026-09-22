# Code City Auth email via Mailgun

This is the Supabase **Send Email Auth Hook** for the Code City website project
`yfpcjxkyjftkekwkekrz`. It reuses `getMailgunConfig()` and the existing Mailgun
server secrets. Inquiry notifications and project-unlock notices remain separate
flows. No Auth identity, password, or project passcode is created by this hook.

## Production configuration

1. Deploy `supabase/functions/auth-email` to the Code City project. Its gateway
   `verify_jwt` setting is **false**: the handler verifies the exact raw request
   using pinned `standardwebhooks@1.0.0` and timestamp validation instead.
2. In **Authentication → Hooks → Send Email**, choose the HTTPS hook URL
   `https://yfpcjxkyjftkekwkekrz.supabase.co/functions/v1/auth-email` and generate
   a fresh hook signing secret. Store that same value, in its dashboard format
   `v1,whsec_<base64>`, as the Edge Function secret `SEND_EMAIL_HOOK_SECRET`.
   Keep it exclusively in Supabase secret configuration. This is a distinct key;
   **never reuse `MAILGUN_WEBHOOK_SIGNING_KEY`** or put keys in browser variables,
   source, screenshots, logs, or deployment notes.
3. Retain existing `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`.
   `MAILGUN_API_BASE` is optional (default `https://api.mailgun.net`; the shared
   config also permits `https://api.eu.mailgun.net`). The sender must belong to
   the verified sending domain. The platform supplies `SUPABASE_URL`; the handler
   rejects any project other than the Code City project above.
4. Enable the Send Email hook and keep the Email provider enabled. The hook
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

1. Run `node --test tests/js/auth-email.test.js` and Deno-check the deployed entry.
   These tests use synthetic signing keys and mock Mailgun; they send no email.
2. Verify an unsigned call to the deployed endpoint returns 401 and cannot send.
3. From `https://codecity.ai/sign-in`, request **Set or reset password** for the
   existing authorized account `dev@codecity.ai`. The UI deliberately does not
   reveal whether an account exists. Confirm the signed hook invocation succeeded
   and Mailgun shows an accepted event followed by a delivered event for that
   recipient. Record event timestamps/message IDs only; never copy link tokens.
4. Confirm the inbox received the Code City email. Open its link privately and
   verify it lands on `https://codecity.ai/admin/set-password`, saves the owner's
   chosen password, and returns to `/sign-in`. For a previously unconfirmed Auth
   account, verify its email confirmation state after this real recovery flow;
   do not assume a sent email confirmed the account.
5. Sign in with that password, verify the Trade City and Code City project choices,
   and set each fixed project passcode through the owner UI. Verify each project
   rejects the other project's passcode and that existing CRM role permissions
   remain intact. No default passcode or emailed plaintext passcode is provided.
6. Confirm logout and invalid/expired recovery links remain denied. Verify the
   public Code City site and existing inquiry-notification path remain unchanged.

Source references: [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook),
[Supabase Auth email example](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend),
[Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks).
