# gatherKids

gatherKids is a comprehensive children's ministry management system built with Next.js 15, React 18, and TypeScript. The application manages family registration, check-in/out processes, incident reporting, ministry enrollments, and administrative oversight for church ministries.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup

- Install dependencies: `npm install` -- takes ~60 seconds. NEVER CANCEL. Set timeout to 5+ minutes.
- Create environment file: Create `.env.local` in repository root with these required variables:

  ```env
  # Application Configuration
  NEXT_PUBLIC_APP_NAME=gatherKids
  NEXT_PUBLIC_APP_VERSION=1.0.0

  # Feature Flags
  NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
  NEXT_PUBLIC_ENABLE_AI_FEATURES=false

  # Development Settings
  NODE_ENV=development

  # Basic Supabase config (use dummy values for build testing)
  NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key
  SUPABASE_SERVICE_ROLE_KEY=dummy-service-role-key
  ```

### Build and Development

- Development server: `npm run dev` -- starts in ~1.1 seconds on port 9002. NEVER CANCEL.
- Production build: `npm run build` -- takes ~31 seconds. NEVER CANCEL. Set timeout to 2+ minutes.
- Start production: `npm run start` -- runs production build
- Access application: http://localhost:9002 (note custom port 9002, NOT 3000)

### Testing

- Run all tests: `npm test` -- takes ~5 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- Watch mode: `npm run test:watch` -- continuous testing
- All tests should pass (currently 83 tests in 14 suites)

### Code Quality

- **CRITICAL**: First-time linting setup: `npm run lint` prompts for ESLint configuration. Choose "Strict (recommended)" and wait ~38 seconds for installation.
- Linting: `npm run lint` -- takes ~5 seconds. EXITS WITH CODE 1 due to many existing warnings/errors (known state, not a failure).
- Type checking: `npm run typecheck` -- takes ~12 seconds, should pass without errors (exit code 0).

### Database Development (Supabase)

- **LIMITATION**: Supabase CLI installation via npm is NOT supported. Use system package manager or direct download.
- **ALTERNATIVE**: Docker installation works: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`
- Local Supabase (if CLI available): `supabase start` -- requires Docker and Supabase CLI
  -- Database reset: `supabase db reset` followed by the project seed scripts (for example `npm run seed:uat:reset`)
  -- Generate types: `npm run gen:types` (generates TypeScript types from Supabase schema)
- **Database migrations**:
  - Prefer timestamp-based naming: `YYYYMMDDHHMMSS_name_of_change.sql` (e.g. `20250903123456_add_new_table.sql`)
  - ALWAYS use timestamp format to avoid version conflicts
  - NEVER use sequential numbering (0001, 0002, etc.) for new migrations
  - Example creation: `supabase migration new name_of_change` (automatically adds timestamp)
- For manual migration files: `date +%Y%m%d%H%M%S`\_name_of_change.sql to generate proper timestamp format

### Type Generation (CRITICAL after schema changes)

- **ALWAYS regenerate types after any schema change**: Ensures TypeScript interfaces match database schema
- Local development: `npm run gen:types` -- generates types from local Supabase instance
- Production/remote: `npm run gen:types:prod` -- requires SUPABASE_PROJECT_ID environment variable
- **Automatic fallback**: Script creates fallback types if Supabase CLI is not available
- **Post-migration workflow**: After running migrations, always run `npm run gen:types` before continuing development
- **File location**: Generated types are saved to `src/lib/database/supabase-types.ts`

## Validation

### **CRITICAL Manual Testing Scenarios**

- **ALWAYS test complete end-to-end login flow after making changes:**
  1. Start dev server: `npm run dev`
  2. Navigate to http://localhost:9002
  3. Verify homepage shows "Welcome to gatherKids" with navigation
  4. Click "Go to Admin Dashboard" (redirects to /login)
  5. Click "admin@example.com" button to auto-fill credentials
  6. Click "Sign In" button
  7. Verify successful redirect to /dashboard with:
     - Navigation sidebar (Dashboard, Check-In/Out, Rosters, etc.)
     - Dashboard cards showing data (Checked-In Children, Pending Incidents, Registrations)
     - "Login Successful" notification toast
  8. Test at least one navigation item (e.g., click "Check-In/Out")

### Database Integrity Validation

- FK integrity check: `bash scripts/db/check_fks.sh "$DATABASE_URL"` -- validates foreign key constraints
- UAT smoke test: `bash scripts/test/uat_smoke.sh http://localhost:9002` -- basic endpoint checks (modify port from default 3000)

### Pre-commit Validation

- **ALWAYS run before committing changes:**
  1. `npm run gen:types` -- regenerate types if schema changed (exit code 0)
  2. `npm run typecheck` -- must pass (exit code 0)
  3. `npm run build` -- must succeed (exit code 0)
  4. `npm test` -- must pass (exit code 0)
  5. **Manual login test** as described above (MANDATORY)

## Common Tasks

### Authentication System

- **Demo accounts** available at /login page (no real authentication needed):
  - Admin: admin@example.com / password
  - Sunday School Leader: leader.sundayschool@example.com / password
  - Various ministry leaders: leader.khalfani@example.com / password
- Authentication uses **custom context-based system**, NOT Supabase Auth
- Login state persists in browser storage

### Data Management Scripts

- Seed scriptures: `npm run seed:scriptures` -- requires proper .env.local with database config
- Seed UAT data: `npm run seed:uat` -- seeds UAT database with comprehensive test data (idempotent upserts)
- Reset UAT data: `npm run seed:uat:reset` -- destructively resets and re-seeds UAT database
- Import Dexie data: `npm run import:dexie` -- requires .env.local config
- Dry run import: `npm run import:dexie:dry` -- preview import without changes
- Generate types: `npm run gen:types` -- local development type generation
- Generate types (prod): `npm run gen:types:prod` -- production type generation

### AI Development Features

- Genkit development: `npm run genkit:dev` -- AI development server (if AI features enabled)
- Genkit with watching: `npm run genkit:watch` -- file watching mode

## Project Structure and Key Files

### Key Directories

```
gather-kids/
├── .github/workflows/     # CI/CD pipelines (ci.yml, uat-db-check.yml)
├── docs/                  # Documentation (SUPABASE_GUIDE.md, etc.)
├── scripts/               # Database and testing utilities
│   ├── db/               # Database scripts (check_fks.sh, snapshot_uat.sh)
│   ├── import/           # Data import tools
│   ├── seed/             # Seeding scripts
│   └── test/             # Testing utilities (uat_smoke.sh)
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── dashboard/    # Admin and leader dashboard
│   │   ├── login/        # Authentication pages
│   │   └── register/     # Family registration
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (auth, database)
│   ├── lib/              # Business logic and utilities
│   └── test-utils/       # Testing utilities and mocks
├── __tests__/            # Jest test files
└── supabase/             # Supabase migrations and config
```

### Configuration Files

- `package.json` -- npm scripts and dependencies
- `jest.config.mjs` -- Jest test configuration with jsdom environment
- `next.config.ts` -- Next.js configuration
- `tailwind.config.ts` -- Tailwind CSS styling configuration
- `tsconfig.json` -- TypeScript configuration
- `.eslintrc.json` -- ESLint configuration (created during first lint run)

## Timing Expectations and Timeouts

### **NEVER CANCEL** - Build and Test Timing

- `npm install`: ~60 seconds (set timeout to 5+ minutes)
- `npm run build`: ~31 seconds (set timeout to 2+ minutes)
- `npm test`: ~5 seconds (set timeout to 60+ seconds)
- `npm run lint`: ESLint setup ~38 seconds first time, then ~5 seconds (set timeout to 2+ minutes)
- `npm run typecheck`: ~12 seconds (set timeout to 60+ seconds)
- `npm run seed:uat`: ~10-30 seconds depending on data size (set timeout to 2+ minutes)
- `npm run seed:uat:reset`: ~15-45 seconds due to deletion operations (set timeout to 2+ minutes)
- Dev server startup: ~1.1 seconds

### Development Server Notes

- **Port**: Always runs on port 9002, NOT the standard 3000
- **Turbopack**: Enabled by default for fast refresh
- **Hot reload**: Works correctly with file changes

## Troubleshooting and Known Issues

### Expected Behavior (Not Errors)

- **ESLint warnings/errors**: `npm run lint` exits with code 1 and shows many warnings/errors. This is the current codebase state, NOT a failure.
- **Google Fonts errors**: Console shows font loading errors due to ad blockers. These are cosmetic.
- **React act() warnings**: Some tests show act() warnings. These are known and don't cause test failures.

### Common Issues and Solutions

- **Build failure**: "supabaseKey is required" - Create .env.local with dummy Supabase values as shown above
- **Test failures**: Ensure jest.setup.ts is properly configured and **mocks** directory exists
- **Port conflicts**: Dev server uses port 9002; ensure it's not in use by other services
- **Supabase CLI issues**: Installation varies by system; Docker is required for local Supabase stack

### CI/CD Pipeline Notes

- **CI workflow**: Runs `npm test` on pull requests (see .github/workflows/ci.yml)
- **Vercel deployments**: Automatic preview deployments on pull requests
- **UAT/Production**: Separate workflows for database migrations and deployments
- **Database checks**: UAT workflow includes FK integrity validation

### Database Architecture Notes

- **Primary storage**: IndexedDB (Dexie.js) for demo/development mode
- **Supabase integration**: Available for production environments
- **Multiple adapters**: Unified DAL (Data Access Layer) supports multiple backends
- **Migrations**: Raw SQL migrations in `supabase/migrations/` (apply with `supabase migration up` or the repo scripts)
- **Row-Level Security (RLS)**: Database-level security policies enforce role-based access control
  - **CRITICAL**: Any changes to RLS policies MUST be documented in `docs/ROLES_AND_ACCESS.md`
  - **Policy updates**: Always update the roles documentation when modifying RLS policies
  - **Testing**: Verify all role permissions work correctly after RLS changes

### Managing Issue Information

- Always include the reference to the original issue in the Pull Request (e.g. Fixes issue #4)
- Provide major status updates in the body of the issue but don't override previous updates so that the progression is clear
- Keep the original title of the PR intact for traceability (i.e. do not rename it as you provide updates)

## Coding guidance: avoid `any` in new code

- Please avoid introducing `any` in new source files. Prefer `unknown` plus a narrow runtime guard, or define small domain types/interfaces and mapping helpers in the DAL layer.
- If a temporary `any` is required for an exceptional case (for example, while migrating legacy data or awaiting regenerated Supabase types), add a localized comment with justification and a TODO linking to the tracking issue: `.github/ISSUES/000-temp-relax-no-explicit-any.md`.
- The long-term goal is to keep `@typescript-eslint/no-explicit-any` enabled as `error` on `develop` and restrict `any` to only well-documented, short-lived exceptions.
