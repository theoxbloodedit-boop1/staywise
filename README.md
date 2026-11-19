# STAYWISE — Hospitality Guest Experience & Property Operations SaaS

Multi-tenant SaaS platform for US & Australian short-term rental operators, built for **GitHub + Vercel + Neon (PostgreSQL + Neon Auth)**.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, local bundled Inter & JetBrains Mono fonts
- **Backend API:** Express 4 wrapped as a Vercel Serverless Function (`api/index.ts` → `server/app.ts`)
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless` + `db/schema.sql`)
- **Authentication:** Strict **Neon Auth** (`@neon/neon-js` Better Auth React adapter + server-side JWT verification via `jose` against Neon Auth JWKS)
- **Media Storage:** `@vercel/blob` when `BLOB_READ_WRITE_TOKEN` is configured, with automatic fallback to `BYTEA` storage in Neon PostgreSQL (`uploaded_assets` table, served via `/api/uploads/:id`)
- **Security:** AES-256-GCM field-level encryption for smart-lock PINs, lockbox codes, and Wi-Fi passwords (`STAYWISE_DATA_KEY`), strict organization/property RBAC, rate limiting, Helmet security headers, and immutable audit logs

---

## 1. Neon Setup (Database + Neon Auth)

1. Create a new project in the [Neon Console](https://console.neon.tech/).
2. From **Connection Details**, copy both connection strings:
   - `DATABASE_URL` (Pooled connection string)
   - `DATABASE_URL_UNPOOLED` (Direct connection string)
3. Open **Auth** in the Neon Console and enable **Neon Auth**:
   - Copy the **Auth URL** (e.g. `https://ep-xxxx.neonauth.us-east-2.aws.neon.build/neondb/auth`).
   - Under **Auth → Domains / Trusted Origins**, add your deployment origins:
     - `http://localhost:3000` (for local development)
     - `https://<your-vercel-project>.vercel.app` (and your custom domain if applicable)
4. **Required:** review the target database, backup and SQL before running migrations.
   API requests never create tables or demo records. On a fresh database:
   ```bash
   STAYWISE_DB_ACTION=reviewed npm run db:migrate
   STAYWISE_CONTROL_DB_ACTION=reviewed npm run db:control:migrate
   ```
   The first command installs base + 001–004 in one transaction, with checksums.
   The second installs 005 separately under its existing checksum ledger. **Both
   are required for this application version**, including account status fields.
   `db/schema.sql` alone is NOT a complete installation.

   **Existing databases:** back up and review schema/history before either command.
   In particular, if 005 objects exist without a matching ledger, STOP and follow
   `docs/control-center/STAGING-GATES-RUNBOOK.md`; do not replay or mark it applied
   blindly. The application migration ledger detects changed files after their
   first recorded installation, not pre-existing schema drift.

   Demo seeding is never part of deployment. Only for a disposable local database:
   `STAYWISE_DEMO_SEED=local-disposable-only npm run db:seed`.
   The seed command refuses NODE_ENV=production and Vercel environments.

---

## 2. Environment Variables

Copy `.env.example` to `.env` for local development, and configure the same variables in **Vercel Project Settings → Environment Variables**:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon PostgreSQL pooled connection string |
| `DATABASE_URL_UNPOOLED` | Recommended | Direct Neon PostgreSQL connection string for CLI migrations |
| `VITE_NEON_AUTH_URL` | Yes | Neon Auth base URL exposed to the Vite frontend |
| `NEON_AUTH_BASE_URL` | Yes | Neon Auth base URL used by Express to derive `issuer` and JWKS URL |
| `NEON_AUTH_ISSUER` | Provider-dependent | Exact signed issuer; set explicitly if different from Auth API URL |
| `NEON_AUTH_AUDIENCE` | Yes | Exact signed provider audience, no guessed default |
| `NEON_AUTH_JWKS_URL` | Optional | Explicit override for `${NEON_AUTH_BASE_URL}/.well-known/jwks.json` |
| `STAYWISE_DATA_KEY` | Yes (Prod) | 64-character hex AES-256-GCM key (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob token; falls back to Neon `uploaded_assets` `BYTEA` if unset |

Generate `STAYWISE_DATA_KEY` with:
```bash
openssl rand -hex 32
```

---

## 3. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. Vercel automatically detects `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Serverless Function:** `api/index.ts` (handles `/api/*`, `/robots.txt`, `/sitemap.xml`)
3. Add the Environment Variables from Section 2 (`DATABASE_URL`, `VITE_NEON_AUTH_URL`, `NEON_AUTH_BASE_URL`, `STAYWISE_DATA_KEY`, and optionally `BLOB_READ_WRITE_TOKEN`).
4. Run the reviewed migrations above before accepting traffic. Check connectivity at `https://<your-domain>/api/health`.
5. Ensure `https://<your-domain>` is added under **Neon Console → Auth → Trusted Origins**.
6. Open `/auth`, create your Neon Auth account and STAYWISE organization, and start managing properties.

---

## 5. Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and Neon Auth URL
STAYWISE_DB_ACTION=reviewed npm run db:migrate
STAYWISE_CONTROL_DB_ACTION=reviewed npm run db:control:migrate
npm run dev
```

Or test the exact Vercel production routing locally:
```bash
npm run build
vercel dev
```

### Verification Commands
```bash
npm run typecheck
npm run build
```

## Current functional boundaries

- Free-access workspace plans: no payment processor, no charge, no new invoice
  issued. Historical `Early Access ($0)` records are preserved in storage but are
  not presented as actual invoices by the billing API.
- Notifications are internal records only, not email/SMS delivery receipts.
  Critical incidents require active dashboard monitoring; no external paging SLA.
- Guest guide assistance uses keyword search, not generative AI.
- Photos: browser JPEG resize (1920px, quality 0.8), then UTF-8 request-size
  preflight below 3.8 MB. Server fully validates/re-encodes private evidence.
  Unsupported formats such as HEIC must be converted by the user. Real mobile
  camera/browser QA is still required; local tests do not certify every device.
