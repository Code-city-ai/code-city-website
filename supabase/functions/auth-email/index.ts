import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { authEmailHandler } from '../_shared/auth-email.ts';

// Supabase Auth authenticates this hook using Standard Webhooks, not a user JWT.
Deno.serve((request: Request) => authEmailHandler(request, {
  verify: (body, headers, secret) => new Webhook(secret).verify(body, headers),
}));
