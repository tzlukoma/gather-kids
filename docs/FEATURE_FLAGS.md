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

| Key | Intent | Prerequisite before enabling |
|-----|--------|------------------------------|
| `gathersystem_door` | New door / check-in GatherSystem surface | **#432 and #385 must both land first.** The flag can resolve true without a session, and the surface cannot check a child out. See below. |
| `gathersystem_guardian` | Guardian household GatherSystem UX | — |
| `gathersystem_bible_bee_household` | Bible Bee household GatherSystem path | — |
| `gathersystem_registration` | Guardian registration wizard GatherSystem UI | **#389 must close first.** Do not broaden this key until then. |
| `gathersystem_admin` | Staff shell (grouped nav) + admin overview GatherSystem UI | — |
| `gathersystem_incidents` | Staff incidents log + acknowledgement GatherSystem UI | **#429 must land, and its backfill run in that environment.** See below. |

Constants: `GATHERSYSTEM_FLAG_KEYS` in `src/lib/flags/env.ts`. Multivariate experiments use `getVariant(key, 'control')` when an issue defines arms.

### Enablement prerequisites

A prerequisite is something that must be true **in the target environment** before the key is raised above 0% there. Merging the code does not satisfy it, and it is per-environment: satisfying it in UAT says nothing about production.

**Percentage rollouts and session-less traffic.** `getFlagEvalContext` fails closed on missing Supabase env, not on a missing session, and `buildFlagDistinctId(undefined)` collapses every session-less caller into one `<env>:anonymous` bucket. So for unauthenticated traffic a percentage rollout is not gradual — the whole bucket resolves together. This affects any key evaluated on a route reachable without a session; #432 tracks it for `gathersystem_door`. Prefer targeting by `userId` over a blanket percentage until it closes.

#### `gathersystem_door` — two open blockers

**Do not enable this key for real door usage until both #432 and #385 land.** They are independent problems and neither fixes the other.

**1. The flag can resolve true without a session (#432).**

`src/app/(admin)/check-in/page.tsx` does use the shared `getFlagEvalContext`, but that helper fails closed only on **missing Supabase env** — `canEvaluateFlags` is `true` whenever the env exists, session or not. A request with no session therefore reaches `getBoolean` with `userId: undefined`, and `buildFlagDistinctId(undefined)` (`src/lib/flags/env.ts:81`) maps every such caller to a single shared bucket:

```
`${deployEnv}:anonymous`
```

So all session-less requests share one evaluation. If PostHog resolves that bucket to true — which a percentage rollout can do — every session-less request gets the new surface, regardless of who they are. Raising this key by percentage is therefore not a gradual rollout for unauthenticated traffic; it is all-or-nothing for the whole anonymous bucket.

`ProtectedRoute` still redirects an unauthorised viewer, so this is unexpected surface exposure rather than a data leak. It does mean the flag is not a reliable rollout control until #432 closes.

**2. The surface cannot check a child out (#385).**

`src/components/gatherKids/check-in-content-gathersystem.tsx` imports `useCheckInMutation` only. The legacy `check-in-view.tsx` imports both `useCheckInMutation` and `useCheckOutMutation`. The GatherSystem surface's two `check_out_at` references (lines 160, 189) are reads that compute who is currently on site; nothing performs a check-out.

So with this flag on, staff can check children **in** but not **out** — on the screen used to release children to their guardians at pickup. This is a feature-parity break, not styling debt, and no amount of visual work on #385 fixes it unless the check-out action is restored with it.

**Mitigation is immediate either way.** Turning the flag off restores the legacy screen, full check-out, and deterministic behaviour.

PR #383 delivered the interaction model for this surface (search, grade chips, multi-select, sticky dock, photos, allergy/incident chips). #385 carries the remainder: stats cards, status tabs, header chrome, table layout — and check-out.

#### `gathersystem_incidents` — trusted role claims

**The backfill must have run in this environment.**

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/backfill-app-metadata-roles.mjs --admins=a@example.com,b@example.com --apply
```

Dry run without `--apply`. Always run the dry form first and read the output.

`GET /api/incidents`, which only this screen calls, resolves the caller's role from `app_metadata`, because `user_metadata` is rewritable by the signed-in user themselves and so cannot carry a privilege claim. Existing accounts hold the role only in `user_metadata`, so until the backfill runs they resolve as `GUEST` and an admin opening this screen is scoped to incidents they logged personally — **narrower than intended, never wider**, and invisible while the flag is at 0%.

**`--admins` is required to grant ADMIN, and that is not a formality.** The backfill's source, `user_metadata.role`, is the very claim this migration exists to stop trusting. Copying it wholesale would launder a self-asserted ADMIN into the trusted store, reintroducing the hole through the fix. So ADMIN is granted only to the addresses you name, and every other ADMIN claim is refused and listed:

```
REFUSED 2 self-asserted ADMIN claim(s) not named in --admins:
  someone@example.com
```

An account in that list you do not recognise is a self-promotion attempt. Leave it out and clear its `user_metadata.role` separately. Lower-privilege roles copy freely — they confer far less and are too many to enumerate.

**Related invariant, for whoever touches this next:** a privileged writer must never sit behind a guard weaker than the claim it writes. `requireAdmin` reads `app_metadata.role` and the routes that write it are guarded by `requireAdmin`; those two facts have to move together. Separating them lets a forged claim be laundered into a durable one that survives the repair.

**Whether it has already been run in a given environment is tracked in #433, not here.** Check there before running it. This file describes the procedure; it deliberately does not record run state, which changes per environment and goes stale in a document.

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

1. **Check the prerequisite column** in *Named GatherSystem keys* above. If the key has one, satisfy it **in this environment** before raising the rollout. This is per-environment: UAT being done does not cover production.
2. **Flag key** — exact string (e.g. `gathersystem_door`).
3. **Enabled** — ON (flag is evaluable).
4. **Type** — Boolean; leave payload empty unless the issue needs one.
5. **Match by** — Properties; filter `deploy_env` **equals** `uat` until a deliberate production rollout.
6. **Rollout** — **0%** until Thomas wants UAT exposure; then raise (often 100% under the UAT filter).
7. Production flips are **Thomas-only**. Do not add a production condition set or raise prod rollout without an issue that authorises it.

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
