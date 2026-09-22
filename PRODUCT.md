# Code City project workspace
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Kemar and authorized administrators. The owner controls the fixed project-access code.

## Product Purpose
Enter through https://codecity.ai/sign-in and move between Code City projects, with Trade City the priority. Trade City needs a new premium web interface rather than a redirect to a native-only product.

## Capabilities and Constraints
Reuse the established React/Vite frontend, Supabase administrator identity and Mailgun integration. Administrator login precedes the owner-set fixed code. Access notifications go to dev@codecity.ai. Preserve client operations, inquiries and marketing. Server authorization must protect project data independently of the rendered page.

This implementation adds portfolio, closed-trade performance, positions and Nova runtime visibility. Trading controls and autonomous activation are outside this web-access assignment. The correct runtime URL, deployment credentials and owner account provisioning must be verified before claiming live access. Missing data is unavailable, not zero; illustrative data is test-only and labelled.

## Brand Commitments
Code City and Trade City names and existing brand assets. The owner requested a world-class, visually striking interface. Preserve the existing Code City portal navigation and recognizable visual system.

## Evidence on Hand
The Code City source contains administrator login, role allowlists, Mailgun delivery and Vercel publishing. Trade City source provides portfolio, performance and Nova status endpoints. No verified live browser-to-runtime connection exists yet.
