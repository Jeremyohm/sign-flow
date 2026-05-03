# Legacy Sign — Claude Code Context

## What This Project Does

Electronic document signing platform for real estate transactions. Upload PDFs, place signature fields, send for signing, and track completion.

**Department:** IT
**Cornerstone path:** `/it/legacy-sign`
**Stack:** React 19 + Vite (frontend), Cloudflare Pages + Pages Functions (hosting + API), Supabase (auth/db/storage), Postmark (email), Stripe (billing)

## Architecture

- **Frontend:** React 19 + Vite → built to `dist/`, deployed to Cloudflare Pages
- **API:** Cloudflare Pages Functions in `functions/` directory (file-based routing)
- **Database:** Supabase (project: Legacy Sign, org: Intellismart, ID: `zewqivrmcgyrztlutrtr`)
- **Proxy:** Cornerstone main router proxies `/it/legacy-sign/*` → `tlh-legacy-sign.pages.dev`

## Key Files

| File | Purpose |
|------|---------|
| `src/` | React frontend source |
| `functions/api/send-email.js` | Postmark email sending |
| `functions/api/v1/envelopes.js` | Envelope CRUD API |
| `functions/api/v1/billing.js` | Stripe billing API |
| `functions/api/v1/keys.js` | API key management |
| `functions/api/v1/templates.js` | Template CRUD API |
| `functions/api/v1/webhooks.js` | Webhook management API |
| `functions/api/v1/stripe-webhook.js` | Stripe webhook handler |
| `functions/api/_lib/auth.js` | Shared auth helpers (Web Crypto API) |
| `supabase-setup.sql` | Base database schema |
| `supabase-api-setup.sql` | API & monetization schema |

## Secrets (in .dev.vars locally, Cloudflare dashboard for production)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (public, VITE_ prefix) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public, VITE_ prefix) |
| `SUPABASE_URL` | Supabase URL (server-side) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret) |
| `POSTMARK_API_TOKEN` | Postmark server token |
| `POSTMARK_FROM_EMAIL` | Sender email address |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Pro plan price ID |
| `STRIPE_BUSINESS_PRICE_ID` | Stripe Business plan price ID |
| `API_KEY_SECRET` | HMAC secret for API key hashing |
| `APP_URL` | Base URL for the app (used in emails, signing links) |

## Key Rules

- Never commit `.dev.vars` or any secrets
- API uses Web Crypto API (Workers-compatible), NOT Node.js `crypto`
- Signing links use per-signer UUID tokens, not envelope IDs
- RLS on all Supabase tables — users only see their own data
- `get_envelope_for_signing` RPC bypasses RLS for public signing flow

## Local Development

```bash
cd src/it/legacy-sign
npm install
npm run dev
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=tlh-legacy-sign
```

## Session-End Checklist

1. `git add` → `git commit` → `git push origin peter/legacy-sign`
2. When ready for production: PR `peter/legacy-sign` → `main`

## Deployment Status

- **Status:** Deployed and live
- **Cloudflare Pages project name:** `tlh-legacy-sign`
- **Production URL:** Proxied via cornerstone at `/it/legacy-sign`
- **Secrets configured:** Yes — all environment variables listed above are set in the Cloudflare Pages dashboard for production
- **Supabase:** Connected and operational (auth, database, storage all active)
- **Postmark:** Configured for transactional signing emails
