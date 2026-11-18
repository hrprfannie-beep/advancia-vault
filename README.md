# VAULTEX

VAULTEX is an early-stage Next.js App Router application for digital-asset
services. The current application includes Supabase email-link sign-in, legal
and support pages, and UI prototypes for several planned services. A page or
demo UI does not imply that a financial service is operational.

## Current status

- Email-link sign-in and the protected dashboard require a configured Supabase
  project.
- The dashboard includes a testnet-only UniSat connection preview. It reads
  the public account address and testnet BTC balance; it does not sign
  messages, send transactions, or persist wallet details. It clears the
  displayed wallet data when the connected account changes or the wallet
  leaves testnet.
- Buy Crypto is a coming-soon placeholder.
- Wallet creation, swaps, yield products, and identity verification are not
  implemented as production services.
- Card issuance and management are disabled until identity verification,
  account ownership controls, and card-program approval are implemented.
- Financial routes are behind the `VAULTEX_FINANCIAL_SERVICES_ENABLED=true`
  feature gate; this must remain off until KYC, verified ownership, and the
  provider controls are implemented and independently reviewed.
- Support chat and ticket submission are UI-only and do not send requests to a
  support system.
- Web Push is optional. Users opt in per device through `/notifications`;
  enabling it requires VAPID keys and the Supabase security migration. The
  settings page can send a test notification only to that signed-in user's
  registered devices, with up to five devices per account.

Do not use this application to handle real customer funds or sensitive identity
documents until the relevant integrations, authorization, data policies, and
compliance controls have been implemented and independently verified.

## Requirements

- Node.js 22 (or a supported Node.js release compatible with the installed
  Next.js version)
- npm
- A Supabase project for authentication

## Local development

```powershell
git clone https://github.com/marychi1/vaultex.git
cd vaultex
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`.env.local` to enable email sign-in. Configure the Supabase authentication
provider and redirect URL to include `http://localhost:3000/auth/callback`.
Without these values, sign-in and the protected dashboard are unavailable.

Never commit `.env.local`, production credentials, or a Supabase service-role
key. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side and use it only for a
server-authorized operation.

For an existing Supabase project, review and apply
[`supabase-security-migration.sql`](./supabase-security-migration.sql) before
deploying. It replaces the prior permissive card/push-subscription policies
with user-scoped access and adds user-scoped transaction reads. Existing
card/push rows remain unowned and inaccessible until an administrator verifies
their owner; transaction rows without a verified `user_id` remain inaccessible.
Do not bulk-assign records based on wallet addresses supplied by clients.

## Optional integrations

See [.env.example](./.env.example) for the environment variable names currently
read by the application. Stripe, MoonPay, and Google Analytics values are
optional for local development. Configuring their credentials alone does not
make the related user flows production-ready; review the current-status notes
and complete the required API authorization, provider setup, data policies,
failure handling, and end-to-end tests first.

To enable browser push, generate a VAPID key pair once (for example with
`npx web-push generate-vapid-keys`) and set `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. Keep the private key server-side and
stable across deployments. Apply the Supabase migration before subscribing
devices. Push requires HTTPS outside localhost and a browser that supports
Web Push. The test action is user-triggered and sends only to devices belonging
to the authenticated account.

Column's integration scaffold is server-side and sandbox-only. Set
`COLUMN_API_KEY` to a Column test key, then set
`COLUMN_SANDBOX_OWNER_USER_ID` and `COLUMN_SANDBOX_BANK_ACCOUNT_ID` server-side
only after verifying that test account's owner. The authenticated owner can
read the account through `/api/column/account`; the response omits account and
routing numbers and owner details. Live keys are rejected. This sandbox flow
does not create accounts or initiate payments. Do not enable production
customer access until ownership, authorization, compliance, and provider
controls are implemented and reviewed.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```

Runtime configuration checks are available through
`/api/health`, which reports whether the required Supabase variables are set,
whether the application is ready for production, and whether the
financial-services feature gate is enabled. It does not reveal secret values.

Pull requests run the same checks in GitHub Actions. The `main` branch is
protected by a repository ruleset that requires pull requests and the CI
quality-check job.

## Deployment

Deploy only after the required integrations, secrets, Supabase schema and
row-level security policies, provider webhooks, and production environment
variables have been reviewed. Configure the deployed application's Supabase
authentication redirect URLs to match the production domain. The current app
is not a production-ready financial product.
