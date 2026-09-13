# Feature flags and PostHog

How gatherKids gates product surfaces remotely and what agents must (and must not) do.

Ops env vars and PostHog project notes also live in [`docs/CI_CD.md`](./CI_CD.md) (PostHog section). Agent hard rules: [`AGENTS.md`](../AGENTS.md).

---

## Two systems (do not conflate)

| System | Location | Purpose | Flip without deploy? |
|--------|----------|---------|----------------------|
| **Remote flags** (PostHog) | `src/lib/flags/` | GatherSystem / experiment kill switches and % rollout | Yes (PostHog UI) |
| **Env toggles** | `src/lib/featureFlags.ts` + `FeatureFlagProvider` | Login magic/password/Google, registration draft persistence, ministry groups UI | No — needs Vercel env + redeploy |

Keep using `getFlag('LOGIN_*')` / `useFeatureFlags()` for env toggles. Do **not** migrate those to PostHog unless an issue explicitly asks.

---

## Remote flags architecture

```
Server Component / route handler
        │
        ▼
  getBoolean / getVariant   ← src/lib/flags/index.ts  (import 'server-only')
        │
        ├─ local / test / next dev  → return caller default (legacy / off)
        │
        └─ UAT or production build  → posthog-node adapter
                                      distinct id: {deploy_env}:{auth uuid}
                                      person props: deploy_env (+ optional role)
```

| File | Role |
|------|------|
| `src/lib/flags/index.ts` | Public façade: `getBoolean`, `getVariant`, `createFlagEvaluator` |
| `src/lib/flags/env.ts` | Deploy env, distinct id, person properties, remote-init gate |
| `src/lib/flags/posthog-adapter.ts` | Lazy `posthog-node` client; fail-closed on errors |
| `src/lib/flags/types.ts` | `FlagAdapter` interface (vendor-agnostic) |
| `src/lib/analytics/browser.ts` | Usage events only; **`advanced_disable_feature_flags: true`** |

Browser PostHog must **not** evaluate flags. Server evaluation is authoritative for UI chrome; never use a flag as authorization (roles / RLS / household scope still apply).

---

## Named GatherSystem keys

Defaults in call sites should keep **legacy UI on** (`getBoolean(key, false)` → new UI only when true).

| Key | Intent |
|-----|--------|
| `gathersystem_door` | New door / check-in GatherSystem surface |
| `gathersystem_guardian` | Guardian household GatherSystem UX |
| `gathersystem_bible_bee_household` | Bible Bee household GatherSystem path |
| `gathersystem_registration` | Guardian registration wizard GatherSystem UI |

Constants: `GATHERSYSTEM_FLAG_KEYS` in `src/lib/flags/env.ts`. Multivariate experiments use `getVariant(key, 'control')` when an issue defines arms.

---

## How to call from code

Only from **Server Components**, route handlers, or other server modules. Prefer the shared session helper so cookie adapter and opaque context stay consistent:

```ts
import { getBoolean } from '@/lib/flags';
import { getFlagEvalContext } from '@/lib/flags/get-flag-eval-context';

const { userId, role, canEvaluateFlags } = await getFlagEvalContext();
if (!canEvaluateFlags) {
  // Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY — no client, no flag call, legacy
  return false;
}

let useGatherSystemDoor = false;
try {
  useGatherSystemDoor = await getBoolean('gathersystem_door', false, {
    userId, // opaque Supabase auth uuid only
    role, // optional; ADMIN | GUARDIAN | …
  });
} catch {
  // Flag provider threw — fail closed to legacy
}
```

`getFlagEvalContext()` uses a `getAll`-only cookie adapter (`getUser()` validates server-side; `src/proxy.ts` refreshes with `setAll`). It never returns email, name, household, or child identifiers.

Rules:

- Pass **opaque auth uuid** as `userId`. Never email, name, or child/household ids.
- Email-shaped strings are coerced to `anonymous` in `buildFlagDistinctId`.
- On missing client, network failure, or non-uat/production: return `defaultValue`.
- Do **not** import `@/lib/flags` into Client Components (`server-only` will fail the build).
- Do **not** use flags to grant elevated data access.

Unit tests: mock `server-only` and `posthog-node` (see `__tests__/lib/flags.test.ts`). Prefer injecting `createFlagEvaluator(adapter)` when testing call sites. Opaque-context assertions live on `getFlagEvalContext` (`__tests__/lib/flags/get-flag-eval-context.test.ts`).

---

## When remote evaluation runs

`shouldUseRemoteFlags()` is true only when:

- `NODE_ENV` is **not** `test` or `development`, and
- deploy env is `uat` or `production` (`NEXT_PUBLIC_DEPLOY_ENV` preferred over `VERCEL_ENV`), and
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` are set.

Local `next dev`, Jest, and CI therefore always get defaults. A production-like `next start` on localhost still should not be relied on for flag QA — use Vercel Preview/UAT.

---

## PostHog project setup (Thomas / ops)

One PostHog Cloud project for UAT + production. Isolation is person `deploy_env` + distinct-id prefix, not separate projects.

Env vars (Vercel Production and Preview):

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_DEPLOY_ENV` | `production` | `uat` |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | `phc_…` | same |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` or `eu` | same |

Creating a boolean flag in the PostHog UI:

1. **Flag key** — exact string (e.g. `gathersystem_door`).
2. **Enabled** — ON (flag is evaluable).
3. **Type** — Boolean; leave payload empty unless the issue needs one.
4. **Match by** — Properties; filter `deploy_env` **equals** `uat` until a deliberate production rollout.
5. **Rollout** — **0%** until Thomas wants UAT exposure; then raise (often 100% under the UAT filter).
6. Production flips are **Thomas-only**. Do not add a production condition set or raise prod rollout without an issue that authorises it.

Privacy: no email, names, photos, DOB, allergies, addresses, child ids, or household ids in flag payloads, person properties, or filters beyond opaque ids / `deploy_env` / `role`.

---

## Usage events (related, not flags)

Browser client (`src/lib/analytics/browser.ts` via `instrumentation-client.ts`) may send only:

- `account_created`
- `registration_submitted`
- `child_checked_in` / `child_checked_out`
- `bulk_attendance_updated`

Identify: `{deploy_env}:{auth uuid}` plus `role` and `deploy_env`. No autocapture, pageviews, session replay, or exception capture. Local/CI/development/localhost never init.

---

## Agent do / don't

**Do**

- Gate new GatherSystem UI behind `getBoolean` / `getVariant` with legacy defaults.
- Keep authz in DAL / role checks independent of flags.
- Document new flag keys in this file and in the PR.
- Escalate before flipping production or changing PostHog billing/project settings.

**Don't**

- Import the flags façade into client components.
- Evaluate flags with `posthog-js` in the browser.
- Put PII in PostHog.
- Treat env `getFlag` and remote `getBoolean` as interchangeable.
- Flip production flags or create PostHog project secrets from an agent session.
