# gatherKids

A comprehensive children's ministry management system designed to streamline registration, check-in/out processes, incident management, and administrative oversight for church ministries.

## 🚀 Features

- **Family Registration**: Complete household profiles with multi-child support
- **Check-In/Out Management**: Real-time attendance tracking with guardian verification
- **Incident Reporting**: Comprehensive incident logging with severity tracking
- **Ministry Management**: Flexible program configuration and enrollment tracking
- **Role-Based Access**: Secure admin and leader permissions
- **Mobile-First Design**: Responsive interface optimized for all devices
- **Real-Time Updates**: Live data synchronization across all users
- **Reporting & Export**: Comprehensive data export and analytics

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with React 18, TypeScript
- **UI Components**: Radix UI with custom Tailwind CSS styling
- **State Management**: React Context API, TanStack Query
- **Database**: Supabase (PostgreSQL) via the DAL / `dbAdapter`
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth
- **Real-time Updates**: TanStack Query (and optional Supabase Realtime through the adapter)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd gather-kids
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

The app is **Supabase-only**. There is no demo mode, IndexedDB backend, `DATABASE_MODE`, or in-app demo users. Local development uses a disposable local Supabase stack, or the UAT Supabase project. Stakeholder demos use UAT.

See **[DATABASE_ENV_SETUP_GUIDE.md](./docs/DATABASE_ENV_SETUP_GUIDE.md)** for UAT/production project setup, GitHub Actions secrets, and Vercel env vars.

#### Local development (recommended)

1. Copy dummy or local-Supabase values into `.env.local` (never commit secrets or real family data).
2. Start local Supabase and seed synthetic data:

```bash
supabase start
npm run gen:types
npm run seed:dev
```

3. Point `.env.local` at that local instance (URLs and keys are printed by `supabase start`):

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=gatherKids
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development

NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=false
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false

# Local Supabase (from `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_SENTRY_DSN=

NEXT_PUBLIC_SITE_URL=http://localhost:9002
```

The factory always returns `SupabaseAdapter`. Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is an error, not a fallback to IndexedDB.

#### UAT (for demos and shared testing)

Point `.env.local` at the UAT Supabase project instead of local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-uat-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-uat-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-uat-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:9002
```

Do not reset or reseed UAT unless an issue explicitly authorizes it.

### 4. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:9002` (note the custom port).

### 5. Access the Application

Open your browser and navigate to `http://localhost:9002`

## 🔐 Test accounts

There are **no in-app demo users**. After `npm run seed:dev` (local) or an authorized UAT seed, log in with the synthetic accounts those scripts create. See `docs/ADMIN_USER_GUIDE.md` to create an admin in a Supabase project.

## 🌱 UAT Data Seeding

For UAT (User Acceptance Testing) environments using Supabase, the application includes a comprehensive seeding script that populates the database with deterministic test data:

### What Gets Seeded

- **3 Ministries**: Sunday School, Bible Bee Training, Khalfani Kids
- **Competition Year**: Bible Bee 2025-2026 with scripture references
- **Scripture Database**: Complete scripture texts in NIV, KJV, and NIV Spanish
- **Test Families**: 3 households with guardians and children
- **Ministry Enrollments**: Sample enrollments linking children to ministries

### Seeding Commands

```bash
# Idempotent seeding (safe to re-run, upserts existing data)
npm run seed:uat

# Reset mode (destructive - deletes existing UAT data first)
RESET=true npm run seed:uat
# or use the shortcut:
npm run seed:uat:reset
```

### Prerequisites

- Valid Supabase environment configured in `.env.local`
- Required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_UAT_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_UAT_SERVICE_ROLE_KEY`

The script includes schema compatibility verification and detailed error reporting to help diagnose issues.

## 📱 Available Scripts

```bash
# Development
npm run dev          # Start development server on port 9002
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking

# Testing
npm test             # Run Jest test suite
npm run test:watch   # Run tests in watch mode

# Database & Type Generation
npm run gen:types    # Generate TypeScript types from Supabase schema
npm run gen:types:prod # Generate types from production environment

# Data Management
npm run seed:scriptures    # Seed scripture references
npm run seed:dev           # Seed local disposable Supabase
npm run seed:uat           # Seed UAT database with test data (idempotent; authorized use only)
npm run seed:uat:reset     # Reset and re-seed UAT database (destructive; authorized use only)

# Documentation (in-app /help)
npm run docs:validate              # Validate help markdown, links, screenshots, changelog
npm run help:parse-changelog       # Smoke-test CHANGELOG.md parser
npm run help:capture-screenshots   # Playwright baseline PNGs (local seeded dev only)

# AI Development (Genkit)
npm run genkit:dev   # Start Genkit AI development server
npm run genkit:watch # Start Genkit with file watching
```

## 🏗️ Project Structure

### UAT / DB Support scripts

Quick helpers added for UAT and migration validation:

- `scripts/db/snapshot_uat.sh` - create a pg_dump snapshot of a target DATABASE_URL
- `scripts/test/uat_smoke.sh` - small curl-based smoke checks (assumes app running)
- `scripts/db/check_fks.sh` - FK integrity checker used by CI
- `.github/workflows/uat-db-check.yml` - manual workflow to apply `supabase/migrations` and run FK checks against UAT (trigger via GitHub Actions > Workflows)

See `docs/PROD_PROMOTION_RUNBOOK.md` for the promotion runbook.

```
gather-kids/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Admin and leader dashboard
│   │   ├── login/            # Authentication pages
│   │   └── register/         # Family registration
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components (Radix)
│   │   └── gatherKids/     # Application-specific components
│   ├── contexts/              # React contexts (auth, features)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and data access
│   │   ├── database/         # Database abstraction layer (SupabaseAdapter)
│   │   │   ├── types.ts      # Database adapter interface
│   │   │   ├── factory.ts    # Always returns SupabaseAdapter
│   │   │   └── supabase-adapter.ts
│   │   └── ai/               # AI/Genkit integration
├── supabase/                  # Raw SQL migrations and Supabase config
│   ├── migrations/           # SQL migration files
│   └── seeds/                # Project seed scripts and SQL
├── docs/                      # Documentation
├── public/                    # Static assets
└── tailwind.config.ts         # Tailwind CSS configuration
```

## 🗄️ Database

Runtime storage is **Supabase (PostgreSQL)** in every environment. The factory always returns `SupabaseAdapter`. There is no `DATABASE_MODE` and no IndexedDB/demo backend.

- **Local**: Disposable local Supabase (`supabase start`) or the UAT project
- **UAT**: Dedicated hosted Supabase project (use this for demos)
- **Production**: Dedicated hosted Supabase project

### Key Data Models

- **Household**: Family unit information
- **Guardian**: Parent/guardian details
- **Child**: Individual child records with medical/allergy info
- **Ministry**: Program configuration and settings
- **Registration**: Annual enrollment records
- **Attendance**: Check-in/out tracking
- **Incident**: Safety and behavior reporting

### Database Schema

The database schema is managed as raw PostgreSQL SQL migrations stored in `supabase/migrations/`. Use the Supabase CLI or the repo helper scripts to apply migrations and generate TypeScript types.

Run `npm run gen:types` to generate TypeScript types from the Supabase schema.

## 🎨 Styling

The application uses Tailwind CSS with a custom design system:

- **Primary Color**: Calming blue (#64B5F6)
- **Background**: Light blue (#E3F2FD)
- **Accent**: Vibrant orange (#FFB74D)
- **Typography**: Poppins (headlines), PT Sans (body)

## 🔧 Development Workflow

### 1. Feature Development

1. Create feature branches from `main`
2. Implement features following the established patterns
3. Use TypeScript for type safety
4. Follow the component structure in `src/components/`
5. Update types in `src/lib/types.ts` as needed

### 2. Database Development

#### Database Architecture

All data access goes through the DAL (`@/lib/dal`) and `dbAdapter`. Do not import `@supabase/supabase-js` outside the DAL and allowed API/script paths. See **[DATABASE_ADAPTERS.md](./docs/DATABASE_ADAPTERS.md)**.

#### Schema Management

The application uses **raw SQL migrations** stored in `supabase/migrations/` for database schema management:

```bash
# Apply migrations locally (requires database connection)
scripts/db/apply_migrations_safe.sh "$DATABASE_URL"

# List unapplied migrations
scripts/db/list_unapplied_migrations.sh "$DATABASE_URL"

# Generate TypeScript types from schema
npm run gen:types
```

#### Migration Strategy

1. **Development**: Create and test SQL migrations locally
2. **UAT**: Auto-deploy via GitHub Actions on push to `uat` branch
3. **Production**: Manual deployment via GitHub Actions with approval

#### Environment-Specific Development

```bash
# Local disposable Supabase
supabase start
npm run seed:dev
npm run dev

# Or point .env.local at UAT (do not reset/reseed UAT unless authorized)
npm run dev
```

For detailed Supabase setup instructions, see **[DATABASE_ENV_SETUP_GUIDE.md](./docs/DATABASE_ENV_SETUP_GUIDE.md)**.

### 3. Component Guidelines

- Use Radix UI primitives for accessibility
- Implement responsive design with Tailwind CSS
- Follow the established form patterns with React Hook Form + Zod
- Use the `useAuth` hook for authentication state
- Use React Query hooks / the DAL (`dbAdapter`) for all data operations
- Do not import `@supabase/supabase-js` outside the DAL and allowed API/script paths

### 4. Testing

```bash
# Type checking
npm run typecheck

# Code linting
npm run lint

# Test suite
npm test

# Build verification
npm run build
```

## 🚀 Deployment

gatherKids uses a multi-environment deployment strategy with strong isolation between development, UAT (preview), and production environments.

### Environment Configuration Overview

- **Local Development**: Local Supabase CLI or the UAT Supabase project
- **UAT/Preview**: Dedicated Supabase project (stakeholder demos)
- **Production**: Dedicated Supabase project, manual deployment with approval

### Quick Local Setup

1. Install dependencies (`npm ci`), put local or UAT Supabase values in `.env.local`.
2. Optional local stack: `supabase start`, `npm run gen:types`, `npm run seed:dev`.
3. `npm run dev` — app at `http://localhost:9002`.

See **[DATABASE_ENV_SETUP_GUIDE.md](./docs/DATABASE_ENV_SETUP_GUIDE.md)** for UAT/production credentials and Vercel env vars.

### Deployment Environments

#### UAT/Preview Deployment

- **Trigger**: Push to `uat` branch
- **Database**: Dedicated UAT Supabase project
- **Migrations**: Applied automatically via `.github/workflows/uat-deploy.yml`
- **Access**: Preview URLs from Vercel

#### Production Deployment

- **Trigger**: Manual workflow dispatch (requires approval)
- **Database**: Dedicated production Supabase project
- **Migrations**: Applied via `.github/workflows/prod-deploy.yml`
- **Security**: Protected environment with required reviewers

### Database Migrations

Migrations use raw PostgreSQL SQL files in `supabase/migrations/`:

```bash
# UAT (automatic on branch push)
git push origin uat

# Production (manual with approval)
# Trigger via GitHub Actions > Workflows > "PROD deploy"
```

### Environment Variables

Required environment variables for each deployment target:

#### Local Development (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:9002
```

#### Production (Vercel)

```env
NEXT_PUBLIC_LOGIN_MAGIC_ENABLED=true
NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true
NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

For complete setup instructions including Supabase project creation, GitHub environment configuration, and Vercel deployment settings, see **[DATABASE_ENV_SETUP_GUIDE.md](./docs/DATABASE_ENV_SETUP_GUIDE.md)**.

## CI, Pull Requests & Deployments

This repository is configured with GitHub Actions and Vercel to provide automated CI and preview deployments.

- CI workflow: `.github/workflows/ci.yml` — runs test suite on pull requests (and on push for branches if enabled). The CI job checks out the code, installs dependencies, and runs `npm test`.
- Vercel Preview: when you open a pull request a Preview Deployment is created by Vercel for the branch. Vercel will build the latest commit on the PR branch and post a preview URL into the PR where you can review the running app.

Notes about how PR runs are chosen

- GitHub uses the workflow file from the base branch (usually `main`) when evaluating `pull_request` events. That means a workflow added only on a feature branch will not run for PRs targeting `main` until the workflow exists on `main`. If you need immediate CI on a branch push, enable `push` triggers in `.github/workflows/ci.yml`.

What happens after a PR is merged

- When a PR is merged into `main` Vercel will deploy the merge commit to your production environment (depending on your Vercel project settings).
- A workflow `.github/workflows/delete-branch.yml` will attempt to delete the source branch after the PR is merged into `main` (this uses the repository token by default). If your organization blocks marketplace actions, the workflow contains an API fallback that uses `GITHUB_TOKEN` to remove the branch.
- When a PR is merged into `main` Vercel will deploy the merge commit to your production environment (depending on your Vercel project settings).

Branch cleanup after merge

- This repository relies on GitHub's native "Automatically delete head branches" feature to remove the source branch after a pull request is merged. To enable it:
  1.  Go to your repository Settings → General → Merge button settings.
  2.  Check "Automatically delete head branches".

If you prefer automation in workflows (instead of the native setting), you can add a workflow that calls the GitHub API to delete the merged branch — but the native setting is simpler and recommended.

If you need to change CI behavior

- Edit `.github/workflows/ci.yml` to add steps (lint, typecheck, build) or to enable `push:` triggers so pushes to feature branches also run CI.
- If you need the delete-branch action to run but your org blocks marketplace actions, either allowlist the action (`peter-evans/delete-branch`) in organization settings or rely on the API fallback step in the workflow.

## 📊 Monitoring & Observability

### Error monitoring (Sentry)

[Sentry](https://sentry.io) is integrated via `@sentry/nextjs`. Init files:

- `src/instrumentation-client.ts` — browser-side error capture (keep `onRouterTransitionStart`)
- `sentry.server.config.ts` — server-side error capture
- `sentry.edge.config.ts` — edge runtime error capture

Do **not** add `sentry.client.config.ts`. That file is deprecated under Turbopack; browser init lives only in `src/instrumentation-client.ts`.

Sentry initializes only when `NODE_ENV=production` **and** `NEXT_PUBLIC_SENTRY_DSN` is set. Shared DSN / `environment` / `release` helpers live in `src/lib/sentry/runtime.ts`.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Public DSN. Do not commit a real value. |
| `NEXT_PUBLIC_DEPLOY_ENV` | Preferred environment tag (`production` or `uat`) |
| `VERCEL_ENV` | Fallback (`production`, `preview`, or `development`) |

`release` is the app version already stamped at build time (`package.json` / `src/lib/build-info.ts`), the same value `/api/version` reports.

The Sentry tunnel is `/monitoring` (`tunnelRoute` in `next.config.ts`). Middleware excludes that path so client events are not intercepted.

**CI dummy builds must not upload source maps.** `.github/workflows/ci.yml` must not set `SENTRY_AUTH_TOKEN`. Uploads are for Vercel/production builds only (see #260).

**Turbopack sourcemaps:** Local `npm run dev` uses Turbopack. Production stays on webpack (`next build` without `--turbopack`). Turbopack production sourcemaps need Next.js ≥15.4.1 **and** `@sentry/nextjs` ≥10.13. This repo is on Next 15.3.8 and `@sentry/nextjs` ^10.11, so do not switch the production build to `--turbopack` until those versions are bumped together.

Sample rates, Replay policy, and PII scrubbing are shared from `src/lib/sentry/` (do not copy magic numbers into each init file):

- **Traces:** `tracesSampleRate` is **0.05** in production and **0.2** in UAT (`NEXT_PUBLIC_DEPLOY_ENV=uat` or Sentry `environment === 'uat'`). It is not `1.0` in production. Local/dev may use a higher rate if Sentry is initialized there.
- **Replay:** stays on. `replaysSessionSampleRate` is `0` (no session recordings). `replaysOnErrorSampleRate` is `1.0` (record only sessions that error). Replay uses default masking: `maskAllText`, `maskAllInputs`, `blockAllMedia`.
- **Logs:** `enableLogs` is `false` so log volume does not consume the free-plan quota.
- **Privacy:** `beforeSend` (`src/lib/sentry/scrub.ts`) strips emails, obvious name fields, and request/response bodies. Stack traces are kept. Do **not** call `Sentry.setUser` with guardian email or child identifiers. **Sentry is an error-monitoring tool, not a store of family records.**

### Performance monitoring (Web Vitals)

Core Web Vitals (CLS, FID, LCP, INP, FCP, TTFB) are reported via `src/components/analytics/web-vitals.tsx` using the Next.js `useReportWebVitals` hook. The component is rendered in `src/app/layout.tsx` and logs metrics to the console in production. To forward metrics to an analytics backend, edit the `useReportWebVitals` callback in that file.

### Health check endpoint

A lightweight health endpoint is available at:

```
GET /api/health
```

Response (HTTP 200):

```json
{ "status": "ok", "timestamp": "2026-03-22T12:00:00.000Z" }
```

Use this URL for uptime monitors, load balancer health checks, and smoke tests. The endpoint has no external dependencies and always returns 200 while the process is running.

---

## 🔄 Dependency updates (Dependabot)

Dependabot is configured in `.github/dependabot.yml` to open weekly pull requests for npm dependency updates. Minor and patch updates are grouped into a single PR to reduce noise. Major version bumps create individual PRs.

---

## 🧪 Testing

### Unit tests

```bash
npm test            # Run Jest test suite
npm run test:watch  # Watch mode
```

### Build verification

```bash
npm run build       # Production build (ESLint + TypeScript gate)
npm run typecheck   # TypeScript check only
npm run lint        # ESLint only
```

Both `npm test` and `npm run build` must pass before merging any PR. CI enforces this via `.github/workflows/ci.yml`.

For detailed E2E test status — including the login → check-in → roster coverage gap — see **[docs/testing.md](./docs/testing.md)**.

---

## 📋 Audit documentation

The application underwent a comprehensive audit in March 2026. Key documents:

- **[docs/COMPREHENSIVE-AUDIT-REPORT.md](./docs/COMPREHENSIVE-AUDIT-REPORT.md)** — 109 findings across UX, Performance, Accessibility, Usability, and Maintenance categories
- **[docs/audit-wave-status.md](./docs/audit-wave-status.md)** — implementation status for each of the 12 audit waves; links to GitHub issues for deferred work

---

## 🤝 Contributing

Humans: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) (conventional commits, trunk-based `main`).

Coding agents: [`AGENTS.md`](./AGENTS.md) is the operating contract. Thomas’s GitHub inbox and notification setup: [`docs/AGENT_WORKFLOW.md`](./docs/AGENT_WORKFLOW.md).

1. Fork the repository (or work on a branch in this repo)
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a **draft** pull request for review (agents must not merge)

## 📚 Additional Resources

### User Documentation

- **User guide**: `/help` on any deployed app (same origin as gatherKids)
- **Release notes**: `/help/releases` (from `CHANGELOG.md`)
- **Maintaining help**: [`docs/HELP_DOCS.md`](./docs/HELP_DOCS.md)

### Developer Documentation

- **[AGENTS.md](./AGENTS.md)**: Tool-neutral contract for coding agents
- **[docs/AGENT_WORKFLOW.md](./docs/AGENT_WORKFLOW.md)**: GitHub inbox for blocked agents and draft PRs
- **[docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md)**: Canonical product description (prefer this over older feature lists)
- **[docs/CI_CD.md](./docs/CI_CD.md)**: Environments, CI, and deploy authority
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)**: Conventional commits and branching
- Historical notes (may conflict with production): `docs/FEATURES.md`, `docs/blueprint.md`

### External Resources

- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Radix UI**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **Next.js**: [https://nextjs.org](https://nextjs.org)
  - **Supabase**: [https://supabase.com](https://supabase.com)
- **Docusaurus**: [https://docusaurus.io](https://docusaurus.io)

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**: The app runs on port 9002 by default. Change it in `package.json` if needed.
2. **Build Errors**: Ensure all dependencies are installed with `npm install`
3. **Type Errors**: Run `npm run typecheck` to identify TypeScript issues
4. **Database Issues**:
   - **Local Supabase**: Use `supabase db reset` and `npm run seed:dev` on a disposable local stack
   - Check `NEXT_PUBLIC_SUPABASE_URL` and API keys in `.env.local`

### Getting Help

- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure you're using the correct Node.js version
- Check that all dependencies are properly installed
- **Supabase Issues**: Verify project URL and API keys in environment variables

## 📄 License

This project is proprietary software. All rights reserved.

---

**Happy coding! 🎉**
