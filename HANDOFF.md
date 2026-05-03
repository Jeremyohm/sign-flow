# Legacy Sign — Developer Handoff

**Date:** 2026-05-02
**From:** Peter Ohm
**Project:** Sign Flow — Electronic document signing platform (personal/monetized version)

---

## IMPORTANT: Salesforce — DO NOT TOUCH

The Salesforce integration (`force-app/`, `deploy_sf.py`, `functions/api/v1/sf-webhook.js`) was built for True Legacy Homes (TLH) internal use — it is NOT part of the personal monetized product. The Apex trigger, callout, callback, and SF webhook endpoint are TLH work and should be left alone.

**Do not:**
- Modify, deploy, or test any Salesforce Apex code
- Change the SF webhook endpoint
- Use the `deploy_sf.py` script
- Connect to or authenticate against any TLH Salesforce org

The SF files are included in this repo for reference only. The monetized version of this product should focus on the core signing platform (envelope creation, template editor, signing flow, Stripe billing) without any Salesforce dependency.

---

## What This Is

A standalone e-signature platform. Upload PDFs, place signature/initials/date/text fields via a drag-and-drop editor, send documents to signers via email, and collect e-signatures. Built to be monetized as a SaaS product with Stripe billing.

**Current live instance (TLH):** https://tlh-legacy-sign.pages.dev
**Note:** The monetized version will need its own Cloudflare Pages project, Supabase project, and domain.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Hosting | Cloudflare Pages + Pages Functions (serverless API) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Email | Postmark (transactional signing emails) |
| Billing | Stripe (built in, activate for monetized version) |
| PDF Processing | pdf-lib (field merging), PyMuPDF (page rendering to PNG) |

---

## File Structure

```
legacy-sign/
├── src/                          # React frontend
│   ├── App.jsx                   # Router and app shell
│   ├── pages/
│   │   ├── Dashboard.jsx         # Main envelope list
│   │   ├── NewEnvelope.jsx       # Create new envelope (upload PDF, add signers)
│   │   ├── Prepare.jsx           # Drag-and-drop field placement editor
│   │   ├── Detail.jsx            # Envelope detail view + status tracking
│   │   ├── Sign.jsx              # Public signing page (signers use this)
│   │   ├── Templates.jsx         # Template list + create new template
│   │   ├── TemplateEditor.jsx    # Visual template field editor
│   │   ├── Login.jsx             # Auth
│   │   ├── Signup.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   └── Notifications.jsx
│   ├── components/
│   │   ├── ui/                   # Reusable UI components (Btn, Card, Modal, etc.)
│   │   └── fields/               # Signature pad, typed signature, form fields
│   ├── lib/
│   │   ├── AuthContext.jsx       # Supabase auth provider
│   │   ├── db.js                 # All Supabase database calls
│   │   └── supabase.js           # Supabase client init
│   └── theme/                    # TLH brand colors
│
├── functions/                    # Cloudflare Pages Functions (API)
│   └── api/
│       ├── send-email.js         # Postmark email sending
│       ├── _lib/
│       │   ├── auth.js           # API key validation (Web Crypto HMAC)
│       │   └── pdf-merge.js      # PDF field value merging (pdf-lib)
│       └── v1/
│           ├── envelopes.js      # Envelope CRUD + sending
│           ├── templates.js      # Template CRUD
│           ├── billing.js        # Stripe billing (inactive for TLH)
│           ├── keys.js           # API key management
│           ├── webhooks.js       # Outbound webhook management
│           ├── sf-webhook.js     # Inbound SF webhook (creates envelope from SF)
│           └── stripe-webhook.js # Stripe webhook handler
│
├── force-app/                    # Salesforce Apex code
│   └── main/default/
│       ├── classes/
│       │   ├── LegacySignCallout.cls      # Sends signing request to Legacy Sign API
│       │   ├── LegacySignCallback.cls     # Receives completion notification, moves Opp stage
│       │   └── LegacySignTest.cls         # Apex test class
│       └── triggers/
│           └── LegacySignTrigger.trigger  # Fires on Opp stage -> "Pending Signature"
│
├── templates/                    # PDF contract templates + creation scripts
│   ├── Home Improvement Agreement-Main.pdf
│   ├── Home Improvement Agreement-Main Contractor_Pay_Cycle.pdf
│   ├── New_Vendor_Packet_Main.pdf
│   ├── New_Vendor_Packet_W9_and_Payout_Schedule.pdf
│   ├── _template_data.json       # HIA template field definitions
│   ├── _nvp_template_data.json   # NVP template field definitions
│   ├── create_hia_template.py    # Script to seed HIA template into Supabase
│   └── create_nvp_template.py    # Script to seed NVP template into Supabase
│
├── migrations/                   # Supabase SQL migrations
│   ├── add_dropdown_field_type.sql    # DONE
│   └── add_date_signed_field_type.sql # PENDING — run before using date_signed fields
│
├── supabase-setup.sql            # Base schema (envelopes, signers, fields, emails, templates)
├── supabase-api-setup.sql        # API keys, webhooks, subscriptions, billing schema
├── deploy_sf.py                  # Deploys Apex code to Salesforce via Metadata API
├── package.json                  # Node dependencies
├── vite.config.js                # Vite build config
├── .dev.vars                     # Local env vars (DO NOT COMMIT)
├── index.html                    # Vite entry point
└── dist/                         # Build output (deployed to Cloudflare)
```

---

## Accounts & Credentials

All production secrets are set in the **Cloudflare Pages dashboard** for project `tlh-legacy-sign`. Local dev uses `.dev.vars`.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (public, embedded in frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public, embedded in frontend) |
| `SUPABASE_URL` | Supabase URL (server-side API functions) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `POSTMARK_API_TOKEN` | Postmark server token for sending emails |
| `POSTMARK_FROM_EMAIL` | Sender email address |
| `STRIPE_SECRET_KEY` | Stripe API key (not active for TLH) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `API_KEY_SECRET` | HMAC secret for hashing API keys |
| `APP_URL` | Base URL (`https://tlh-legacy-sign.pages.dev`) |
| `SF_WEBHOOK_API_KEY` | API key SF uses to call Legacy Sign |

**Supabase project:** Legacy Sign (org: Intellismart, ref: `cfoeshzynalhsfrvotmz`)
**Cloudflare Pages project:** `tlh-legacy-sign`

---

## How It Works (End to End)

### Manual Flow (User Creates Envelope)
1. User logs in, clicks "New Envelope"
2. Uploads a PDF, names it, adds signers (name + email + role)
3. Prepare page: drag-and-drop signature/initials/date/text fields onto PDF pages, assign each to a signer
4. Send: system emails each signer a unique signing link (UUID token)
5. Signer opens link, fills fields, draws/types signature, submits
6. Sequential signing: next signer unlocked only after previous completes
7. All signed: envelope status → "completed", optional webhook fires

### Salesforce-Triggered Flow (Automated)
1. SF Opportunity stage changes to **"Pending Signature"** (Estate Sale record type only)
2. `LegacySignTrigger` fires → calls `LegacySignCallout.sendForSigning()`
3. Callout POSTs to `https://tlh-legacy-sign.pages.dev/api/v1/sf-webhook` with:
   - Template ID, signer info (owner + primary contact), key items, field values
   - `X-API-Key` header for auth
4. Legacy Sign creates envelope from template, sends signing emails
5. When all signers complete, Legacy Sign POSTs back to SF via `LegacySignCallback`
6. Callback moves Opportunity stage from "Pending Signature" → "Approved"

---

## Salesforce Integration Details

### Deployed Apex Components
- **LegacySignTrigger** — `after update` on Opportunity, fires when stage → "Pending Signature"
- **LegacySignCallout** — `@future(callout=true)`, builds payload and POSTs to Legacy Sign
- **LegacySignCallback** — `@RestResource(urlMapping='/LegacySignCallback')`, receives completion events
- **LegacySignTest** — Apex test class

### SF Configuration
- **Custom Label:** `LegacySign_API_Key` — stores the API key value
- **Remote Site Setting:** `LegacySign_Webhook` — allows callouts to `tlh-legacy-sign.pages.dev`
- **API Key Value:** `556b5acead8751ebc273b939569c53dc4c6f050763ab50e59fbecc1c32fb5538`

### SF Org Notes
- `Primary_Contact_Email__c` and `Primary_Contact_First_Name__c` are **formula fields** (read-only)
- `Address__c` is a formula; `Left_Main__Full_Address__c` is the writable address field
- `Relationship__c` is required on Contact records
- `RE_DD_Director_of_Acquisition_Contact__c` is required when stage is Approved/IC Ready/Retrade/Closing Escrow
- The field labeled "Key Items" uses the API name `CP_Reason_for_Seeking_Care_Services__c` (relabeled — original Key_Items__c creation was blocked by LTA field limit)

### Deploying SF Code
```bash
python deploy_sf.py              # deploys to production
python deploy_sf.py --sandbox    # deploys to sandbox
```
Requires `SF_CONSUMER_KEY`, `SF_CONSUMER_SECRET`, `SF_DOMAIN` env vars (in `.env`).

---

## Template Editor

Visual drag-and-drop tool for building reusable signing templates.

### Field Types
| Type | Behavior |
|------|----------|
| `signature` | Signer draws or types signature |
| `initials` | Signer draws or types initials |
| `date` | Calendar date picker, or auto-stamp "Today's Date" |
| `date_signed` | Auto-stamps current date when signer submits (read-only) |
| `text` | Free text input — supports plain, $ dollar, or % percent formatting |
| `dropdown` | Configurable dropdown options stored in `options` JSONB column |

### Existing Templates
| Template | Supabase ID |
|----------|-------------|
| Estate Sale Agreement (SD) | `dfae483f-e2f9-4341-8133-82819a1c98f5` |
| Home Improvement Agreement (HIA) | `db97ee3e-44e8-4112-a42a-bead0ed0bf47` |

### Field Coordinate System
- PDF point space: **612 x 792** (US Letter at 72 DPI)
- Origin: top-left of each page
- Fields have: `x`, `y`, `w`, `h`, `page`, `signer_index`, `type`, `value` (default), `options` (dropdown)

---

## Database Schema

Two SQL files define the full schema:

1. **`supabase-setup.sql`** — Core tables:
   - `envelopes` — documents to sign (status: draft/sent/in_progress/completed/declined)
   - `signers` — recipients per envelope (with sign_token UUID, access_code, sort_order)
   - `fields` — placed fields per envelope (type, position, value)
   - `emails` — email send log (Postmark tracking)
   - `templates` — reusable field layouts
   - RPC: `get_envelope_for_signing()` — public signing data fetch (bypasses RLS)
   - RPC: `verify_access_code()` — access code verification with lockout after 5 attempts

2. **`supabase-api-setup.sql`** — API & monetization:
   - `api_keys` — HMAC-hashed API keys with scopes
   - `webhooks` — outbound webhook registrations
   - `webhook_deliveries` — delivery log
   - `subscriptions` — billing plans (free/pro/business/enterprise)
   - `api_usage` — rate limiting log
   - RPC: `validate_api_key()`, `get_active_webhooks()`

### Pending Migration
`migrations/add_date_signed_field_type.sql` — needs to be run in Supabase SQL Editor before creating envelopes that use the `date_signed` field type.

---

## Local Development

```bash
npm install
npm run dev          # starts Vite dev server
```

Create a `.dev.vars` file with all the env vars from the table above.

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=tlh-legacy-sign
```

Or just: `npm run deploy`

---

## What's Done

1. Full envelope lifecycle — create, prepare (place fields), send, sign, complete
2. CC recipient role support
3. Sequential signing enforcement (server-side RPC)
4. PDF field merging with pdf-lib
5. Create-from-template API with field pre-fill
6. Template editor — visual drag-and-drop field placement on PDF pages
7. Multiple field types — signature, initials, date, date_signed, text (plain/$/%)), dropdown
8. Signer role management with field reassignment
9. Access code protection (optional per signer, 5-attempt lockout)
10. API key system (HMAC-based, scoped)
11. Outbound webhook system
12. Email tracking (Postmark)
13. Stripe billing integration (built in, ready to activate)

## What's Left (Monetized Product)

1. **Run `date_signed` migration** — `migrations/add_date_signed_field_type.sql` needs to be executed in Supabase SQL Editor before creating envelopes with that field type
2. **Set up your own infrastructure** — Create a new Cloudflare Pages project, new Supabase project, new Postmark account, and new Stripe account. Update all env vars accordingly.
3. **Activate Stripe billing** — The billing code is built (`functions/api/v1/billing.js`, `functions/api/v1/stripe-webhook.js`). Create Stripe price IDs for Pro/Business plans and set the env vars.
4. **Remove TLH-specific references** — Update branding, email templates, and any TLH-specific text in the UI
5. **Landing page / marketing site** — Currently just has a login page, needs a public-facing landing page for the SaaS product
6. **VA Benefits section** — Pages exist under `src/pages/va/` (ClaimBuilder, ConditionExplorer, CpPrep, RatingCalculator, VaBenefits) — separate feature area, status unknown

---

## Key Rules

- **Never commit `.dev.vars`** or any secrets
- API functions use **Web Crypto API** (Cloudflare Workers compatible), NOT Node.js `crypto`
- Signing links use **per-signer UUID tokens**, not envelope IDs
- **RLS enabled** on all Supabase tables — users only see their own data
- `get_envelope_for_signing` RPC **bypasses RLS** for the public signing flow
- **DO NOT touch Salesforce code** — `force-app/`, `deploy_sf.py`, `sf-webhook.js` are TLH work, not part of this product

---

## Git Info

- **Repo:** `eaglecoug2026/sign_flow`
- **Branch:** `main`
