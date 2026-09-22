# Shared deployment authentication

Owner rule, 2026-09-22: Supabase and shared agent/deployment credentials must
not depend on one Mac's Keychain. Do not run Supabase CLI login/logout/link,
read cached credentials, invoke `security` to extract tokens, approve persistent
Keychain access, or substitute a plaintext token file or shell startup variable.

Use the existing owner-approved browser session for interactive Supabase work.
Reuse signed-in tabs; do not open repeated login windows or close the user's tabs.
For automation, use only an authorized secret manager or protected CI secret
injecting `SUPABASE_ACCESS_TOKEN` into the process. Use the existing reviewed
Trade City `scripts/supabase_cli.py` guard with this repository as `--workdir`;
do not duplicate its credential handling. If that guard or an authorized token
is unavailable, use the approved browser workflow. Never fall back to raw CLI.

Missing access fails once without prompts, login, credential creation, or retries.
Tokens must not enter Git, chat, argv, logs, bundles, database rows, or evidence.
Do not delete Keychain entries or change their permissions to silence prompts.
These rules concern deployment credentials; preserve the existing Supabase
end-user session and owner-set project-code authentication paths.
