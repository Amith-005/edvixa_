# Edvixa

Edvixa is a full-stack learning, practice, doubt-resolution, teacher-booking, and administration platform. The repository is an npm-workspaces monorepo with a React web client and an Express/MongoDB API.

## Technology

- **Web:** React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, React Hook Form, Zod
- **API:** Node.js 22+, Express 5, TypeScript, Mongoose, MongoDB
- **Security:** short-lived JWT access tokens held in memory, rotating refresh-token cookies, role authorization, trusted-origin checks, request throttling, Helmet security headers, validation, audit logs
- **External services:** Gemini or Grok for generated assessments, Resend for transactional email, and Razorpay for payments
- **Architecture:** feature-based React frontend and modular MVC/service/validation backend

## Implemented product areas

### Student portal

Dashboard, profile, adaptive practice, results and answer review, progress, doubt polls, teacher discovery, teacher profiles, booking checkout, sessions, leaderboard, announcements, fee/receipt history, and support tickets.

### Teacher portal

Dashboard, profile and approval workflow, availability slots, booking requests, doubt polls, sessions, earnings, students, announcements, and support tickets.

### Admin portal

Operational dashboard, user administration, teacher approvals, booking operations, fee/refund/payout controls, subject/topic management, analytics, CSV reports, announcements, platform settings, role/permission visibility, security/audit logs, and support-ticket handling.

See [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) for the administrator workflow.

## Local setup without Docker

### Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- MongoDB Atlas or a directly installed MongoDB server

### 1. Configure environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` and supply a working `MONGODB_URI`. The Vite development server proxies `/api` to `http://localhost:5000`, while `VITE_API_URL` may be used for a separate API origin.

Set `AI_PROVIDER=gemini` with `GEMINI_API_KEY`, or set `AI_PROVIDER=grok` with
`XAI_API_KEY`. Practice creation deliberately fails with a retryable service
error when the selected AI provider is unavailable; production never falls
back to hard-coded or mock questions.

### 2. Install exact dependencies

```bash
npm ci
```

### 3. Seed the database

```bash
npm run seed
```

The seed creates the administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, subjects, demo teacher profiles, availability, and reviews. Demo teacher accounts use the development-only password `TeacherDemo@123`; never retain demo accounts or credentials in a public production database.

### 4. Start development

```bash
npm run dev
```

- Web: `http://localhost:5173`
- API health: `http://localhost:5000/api/v1/health`
- API readiness: `http://localhost:5000/api/v1/ready`

## Verification commands

```bash
npm run typecheck
npm test
npm run build
npm run check
npm audit
npm audit --omit=dev
```

`npm run check` performs type checking, API tests, and production builds for both workspaces.

## Database index deployment

Production disables Mongoose's automatic index creation. After reviewing a backup and during an appropriate maintenance window, synchronize declared indexes with:

```bash
npm run db:indexes
```

Treat index changes as a database migration. Review the command output before running against a critical database.

## Production configuration

Production startup intentionally fails when security-critical configuration is incomplete. It requires:

- HTTPS values for `APP_URL` and every `CLIENT_URL` origin
- unique access and refresh JWT secrets
- secure refresh cookies
- a non-default administrator email and password
- Resend with a verified sender domain
- Razorpay credentials and a webhook secret
- a Gemini or xAI API key for the selected `AI_PROVIDER`
- a production MongoDB connection string and suitable network access controls

### AI practice generation

The API requests a structured assessment from the configured model, validates
the response against a strict schema, rejects duplicate questions/options and
unknown topics, and stores the accepted questions with the provider/model used.
Model names, timeout, and retry count are environment-controlled. Keep model
keys only in the API secret store; never expose them through `VITE_*` variables.

Recommended topology: serve the built web application and `/api/v1` through one HTTPS origin/reverse proxy. Same-origin deployment simplifies cookie and CSRF protections. When the web and API use different origins, set exact comma-separated frontend origins in `CLIENT_URL`, configure the cookie settings carefully, and never use wildcard credentialed CORS.

### Build and start

```bash
npm ci
npm run check
npm run db:indexes
npm run start:api
```

Build the web workspace with `npm run build --workspace=@edvixa/web` and deploy `apps/web/dist` through a static host configured to return `index.html` for SPA routes.

### Email

Use `EMAIL_PROVIDER=resend`, set `RESEND_API_KEY`, and set `EMAIL_FROM` to a sender on a verified domain. Verification and password-reset links use `APP_URL`.

### Payments

Use `PAYMENT_PROVIDER=razorpay` and configure all Razorpay values. Register this webhook endpoint in Razorpay:

```text
POST /api/v1/payments/razorpay/webhook
```

The endpoint expects the raw request body and validates the webhook signature. Test successful payment, failed payment, expired reservation, cancellation, refund, and duplicate-webhook behavior in Razorpay test mode before enabling live keys.

## Operational notes

- `/api/v1/health` confirms the process is running; `/api/v1/ready` confirms MongoDB is connected.
- The API emits JSON request logs with request IDs, status codes, and durations.
- Expired payment reservations are released automatically.
- Graceful shutdown closes the HTTP server and MongoDB connection on `SIGTERM`/`SIGINT`.
- Back up MongoDB, test restore procedures, configure uptime/error monitoring, and rotate secrets regularly.

The code-level verification report is in [`docs/PRODUCTION_READINESS_REPORT.md`](docs/PRODUCTION_READINESS_REPORT.md). Deployment-specific checks that require real infrastructure remain listed in [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md).
