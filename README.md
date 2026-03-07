# Umbrella SaaS

Umbrella SaaS is a multi-tenant verification platform built with Next.js, Prisma, PostgreSQL, Stripe, and SMTP-based transactional email. It provides a self-serve customer dashboard, an isolated admin console, credit-based billing, workspace-aware access control, and a growing catalog of verification and KYB services.

The application is designed around two operating contexts:

- **Personal workspace** for individual users
- **Organization workspace** for teams with role-based access and shared wallets

Service execution is tracked as structured transactions, with support for **test**, **live**, **single**, and **bulk** flows where implemented.

## Core capabilities

- Email/password authentication with verification and password reset flows
- Personal and organization workspaces
- Team membership, invitations, role management, and workspace switching
- Credit wallet model with Stripe top-ups and transaction ledgering
- Dynamic service catalog backed by the database
- Country-based and operation-based service pricing support
- Provider-backed service execution with stored request/response payloads
- Mock test routes for service previews and UI testing
- Separate admin surface with host-based isolation
- Billing profiles for personal and company customers
- Compliance consent gating for selected countries/services

## Implemented service areas

The current codebase includes UI and API support for:

- Address Verification
- Phone Status Check
- Phone Risk Score
- Phone ID
- Full Phone Intelligence
- KYB (company search and advanced search)

Most service modules follow the same pattern:

- public dashboard page under `src/app/(public)/dashboard/services/...`
- test and live execution endpoints under `src/app/api/services/...`
- transaction mappers and output panels for consistent history rendering

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS, Radix UI primitives, lucide-react
- **Database:** PostgreSQL
- **ORM:** Prisma with `@prisma/adapter-pg`
- **Billing:** Stripe Checkout + webhook processing
- **Email:** Nodemailer / SMTP
- **State:** React state + Zustand where needed
- **Validation/Form handling:** Zod, React Hook Form

## Project structure

```text
.
├── docker-compose.yml
├── next.config.ts
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seedServices.js
│   └── seed-address-prices.ts
├── public/
└── src/
    ├── app/
    │   ├── (public)/               # customer-facing auth + dashboard
    │   ├── admin/                  # isolated admin UI
    │   └── api/                    # route handlers for auth, billing, services, admin
    ├── components/                 # reusable UI modules
    ├── context/                    # React context providers
    ├── lib/                        # prisma, billing, service mappers, email, session helpers
    ├── proxy.ts                    # host-aware admin/public routing guard
    └── store/                      # client-side stores
```

## Architecture overview

### 1. Authentication and session model

User sessions are stored in the database and linked through a `session` cookie. The session record also carries the currently selected organization workspace via `activeOrgId`.

Important files:

- `src/lib/session.ts`
- `src/app/api/auth/*`
- `src/app/api/session/active-org/*`

### 2. Multi-tenant workspace model

The app supports:

- **personal ownership** through `users`
- **organization ownership** through `organizations` and `organization_members`

Billing context and service usage are resolved from the active workspace. If the selected org is no longer valid, logic falls back safely to personal context.

Important files:

- `src/lib/billing/context.ts`
- `src/app/api/organizations/*`
- `prisma/schema.prisma`

### 3. Service execution model

Every service call can be recorded as a transaction with:

- service key
- execution mode (`single` or `bulk`)
- environment (`test` or `live`)
- request payload
- response payload
- duration
- final status (`OK`, `REVIEW`, `NOK`, `ERROR`)

This makes the dashboard transaction history renderer reusable across services.

Important files:

- `src/lib/services/serviceRegistry.ts`
- `src/lib/services/mappers/*`
- `src/app/api/transactions/route.ts`
- `prisma/schema.prisma` (`Transaction` model)

### 4. Billing and credits

Credits are stored in a wallet that belongs either to a user or an organization. Top-ups are processed through Stripe Checkout, and all balance changes are written to `credit_transactions`.

The billing model includes:

- wallet per personal or org context
- billing profile per wallet
- Stripe customer synchronization
- invoice metadata storage
- discounts based on purchase volume

Important files:

- `src/lib/billing/wallet.ts`
- `src/lib/billing/context.ts`
- `src/lib/billing/pricing.ts`
- `src/app/api/billing/*`
- `src/app/api/stripe/webhook/route.ts`

### 5. Admin isolation

The admin console is intentionally split from the public application. In production, `src/proxy.ts` restricts admin pages and admin API routes to the configured admin host.

This is useful when you want:

- separate internal access patterns
- reduced accidental public exposure of admin routes
- a distinct cookie/session model for admins

## Database model summary

The Prisma schema defines the core platform entities:

- `User`
- `Session`
- `Organization`
- `OrganizationMember`
- `FavoriteService`
- `Transaction`
- `Service`
- `ServiceCountryPrice`
- `ServiceOperationPrice`
- `CreditWallet`
- `CreditTransaction`
- `BillingProfile`
- `ComplianceConsent`
- token tables for verification, reset, and invites
- `AdminSession`

The current repository includes `schema.prisma`, but **Prisma migration files are not checked in**. Local setup therefore requires either:

- an existing compatible database schema, or
- creating the schema from Prisma during development

## Environment variables

Create an `.env` file with the values your environment needs.

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe server-side API key |
| `UMBRELLA_API_KEY` | Provider API key for Umbrella auth |
| `UMBRELLA_CUSTOMER_ID` | Provider customer identifier |
| `UMBRELLA_AUTH_URL` or `UMBRELLA_AUTH_URL_SANDBOX` | Token endpoint for provider auth |
| `UMBRELLA_API_BASE` or `UMBRELLA_API_BASE_SANDBOX` | Base URL for provider service calls |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

### Recommended

| Variable | Purpose |
|---|---|
| `SMTP_FROM` | Default sender address |
| `NEXT_PUBLIC_APP_URL` | Base application URL used in auth and billing flows |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature validation |
| `ADMIN_HOST` | Hostname used for admin surface isolation |
| `APP_URL` | Fallback app URL in invite flow |
| `VERCEL_URL` | Fallback URL in hosted deployments |

### Example

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/umbrella
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_HOST=admin.localhost

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

UMBRELLA_API_KEY=...
UMBRELLA_CUSTOMER_ID=...
UMBRELLA_AUTH_URL_SANDBOX=...
UMBRELLA_AUTH_URL=...
UMBRELLA_API_BASE_SANDBOX=...
UMBRELLA_API_BASE=...
```

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

A local Postgres service is included:

```bash
docker compose up -d
```

The container expects the following variables to exist in your environment:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

### 3. Generate Prisma client

The schema outputs the client to `generated/prisma/client`, so generate before starting the app.

```bash
npx prisma generate
```

### 4. Apply the schema

Because migrations are not present in the repository, development environments typically need a schema push:

```bash
npx prisma db push
```

Use your normal migration flow instead if your team manages schema outside this repository.

### 5. Seed platform data

This project currently has two relevant seed entry points:

```bash
node prisma/seedServices.js
npx prisma db seed
```

What they do:

- `seedServices.js` populates the base service catalog
- `prisma db seed` runs `prisma/seed-address-prices.ts` as configured in `package.json`

### 6. Run the app

```bash
npm run dev
```

Then open:

- public app: `http://localhost:3000`
- admin app: configure your local host mapping if you want to test `ADMIN_HOST` behavior such as `admin.localhost`

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Service pricing model

Pricing is database-driven.

The schema supports:

- **base service pricing** via `services.price_credits`
- **country-specific pricing** via `service_country_prices`
- **operation-specific pricing** via `service_operation_prices`

The address verification service already uses country-based overrides. Credit conversion is currently based on:

- `1 credit = €0.20`

## Billing model

Stripe top-ups start from a minimum credit amount and support volume discounts. The checkout flow creates or updates a Stripe customer based on the active billing profile.

Key implementation points:

- personal and company billing profiles
- company VAT/tax ID support
- invoice and receipt metadata persisted back into the ledger
- one wallet per user or organization

Important files:

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/setup/route.ts`
- `src/app/api/billing/invoices/route.ts`
- `src/app/api/stripe/webhook/route.ts`

## Admin console

The admin area lives under `src/app/admin` and has its own auth flow and API namespace under `src/app/api/admin`.

Current admin capabilities include:

- dashboard overview
- user management
- admin-user management
- service administration
- transaction monitoring
- settings area

## Compliance gating

The codebase includes service/country-based compliance consent gating. For example, address verification checks whether a consent record exists for gated countries before allowing the user into the flow.

Important files:

- `src/app/api/compliance/consent/route.ts`
- gated service pages under `src/app/(public)/dashboard/services/*`

## Test vs live execution

Service modules distinguish between:

- **test mode** for mock/demo results and UI validation
- **live mode** for real provider-backed execution

This is especially useful for:

- UX testing without provider costs
- demo environments
- validating transaction rendering before enabling live credentials

## Notable implementation details

- The provider auth token is cached in-memory per auth URL to separate sandbox and live sessions.
- The admin surface is restricted by host rules in `src/proxy.ts`.
- Prisma uses `@prisma/adapter-pg` with a shared `pg` pool.
- The service renderer registry decouples transaction storage from service-specific display components.
- The app uses strict workspace-aware billing logic so org actions only bill org wallets when the active org membership is valid.

## Suggested next improvements

If this repository is intended for long-term team onboarding, the next high-value additions would be:

1. Add a committed `.env.example`
2. Add Prisma migrations to version database changes explicitly
3. Add integration tests for service routes and billing flows
4. Add architecture diagrams for workspace, billing, and transaction flows
5. Add deployment notes for admin host setup and Stripe webhook configuration

## License

This repository does not currently declare a license. Add one if the project is intended for external sharing.
