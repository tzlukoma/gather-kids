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
| `gathersystem_guardian` | Guardian household shell + home | — for the shell and home. The Bible Bee scripture and essay screens are a separate key. See below. |
| `gathersystem_bible_bee_household` | Bible Bee household GatherSystem path | — |
| `gathersystem_registration` | Guardian registration wizard GatherSystem UI | **#389 must close first.** Do not broaden this key until then. |
| `gathersystem_admin` | Staff shell (grouped nav) + admin overview GatherSystem UI | — |
| `gathersystem_incidents` | Staff incidents log + acknowledgement GatherSystem UI | **#429 must land, and its backfill run in that environment.** See below. |
| `gathersystem_auth` | Account surfaces — `/onboarding` and `/unauthorized` — GatherSystem type scale | — for what it covers. **It must not be extended to `/login` or `/create-account`** until the question on #379 is answered. See below. |

Constants: `GATHERSYSTEM_FLAG_KEYS` in `src/lib/flags/env.ts`. Multivariate experiments use `getVariant(key, 'control')` when an issue defines arms.

### Enablement prerequisites

A prerequisite is something that must be true **in the target environment** before the key is raised above 0% there. Merging the code does not satisfy it, and it is per-environment: satisfying it in UAT says nothing about production.

**Percentage rollouts and session-less traffic.** `getFlagEvalContext` fails closed on missing Supabase env, not on a missing session, and `buildFlagDistinctId(undefined)` collapses every session-less caller into one `<env>:anonymous` bucket. So for unauthenticated traffic a percentage rollout is not gradual — the whole bucket resolves together. This affects any key evaluated on a route reachable without a session; #432 tracks it for `gathersystem_door`, and #379 is the open decision about what to do on routes whose audience is *entirely* session-less. Prefer targeting by `userId` over a blanket percentage until it closes.

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

#### `gathersystem_auth` — scoped to session-bearing routes only

**This key covers `/onboarding` and `/unauthorized`, and nothing else.** Both
require a session and redirect to `/login` without one, so
`getGatherSystemFlag`'s no-session guard is correct for them and a percentage
rollout buckets per user in the ordinary way. There is no prerequisite; it is
safe to raise.

**It must not be extended to `/login` or `/create-account`.** Their audience is
unauthenticated, so every request collapses into the one `<env>:anonymous`
bucket described above: the key would be on for all signed-out traffic or none,
which is not a rollout. #379 carries that decision with options; until it is
answered those two routes stay legacy on both sides of the flag.

A second-order effect worth knowing before you raise this key: a visitor can
meet a GatherSystem `/onboarding` immediately after a legacy `/login`, because
the two sides of that journey are gated differently. That is a cosmetic
inconsistency rather than a fault, but it is the reason #379 shipped partially
rather than waiting.

#### `gathersystem_guardian` — shell and home only

**This key covers the `/household` shell and the guardian home, and nothing
else.** Off, `/household` is the legacy household profile inside the legacy
sidebar and nothing about the section changes. On, `/household` is the
GatherSystem home (greeting, then one card per child carrying that child's
on-site state and, for a child in Bible Bee, their scripture progress) and the
household record it used to show moves to `/household/details`, which the shell
links as `Household` and which `View full household` on the home also reaches.
Nothing a guardian can reach today becomes unreachable on either side of the
flag.

`/household` is behind the guardian session guard, so the flag is always
evaluated with a real user id and a percentage rollout buckets per user in the
ordinary way. There is no prerequisite; it is safe to raise.

**It is not the Bible Bee household key.** The scripture list and the essay
screens are `gathersystem_bible_bee_household` and are still legacy. Raising
this key alone gives a GatherSystem home whose `Open scripture list` lands on
the legacy scripture screen — deliberate, and the reason the two are separate
keys — but worth knowing before a UAT walkthrough.

**The on-site pills read attendance through a server route, and must keep
doing so.** `GET /api/household/attendance` takes a date and nothing else: it
derives the household from the session, the children from the household, and
the rows from those children. Do not move this read back into a client hook and
do not add a `childIds` parameter. `attendance` has no RLS and the browser holds
an anon-key Supabase client, so a browser-supplied child list is payload shaping,
not authorization — `__tests__/api/household-attendance-auth.test.ts` fails if
either the child list or the household id becomes something the request carries.

The wider problem this route does *not* solve — RLS is absent across `children`,
`households` and `guardians`, and `src/lib/database/factory.ts` publishes the
adapter as `window.gatherKidsDbAdapter` — is tracked on its own issue.

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

## Turning a flag on locally

Because remote evaluation never runs locally, the local adapter returns each
flag's default — and every GatherSystem default is **off**. Without an override
there is no way to render a GatherSystem screen on a dev machine at all.

`GATHERSYSTEM_LOCAL_FLAGS` is a comma-separated allowlist read by the **server**:

```bash
GATHERSYSTEM_LOCAL_FLAGS=gathersystem_door NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true npm run dev
```

`npm run dev:gathersystem` boots with every key in `GATHERSYSTEM_FLAG_KEYS` on, plus password login.

Rules:

- Only the keys in `GATHERSYSTEM_FLAG_KEYS` are honoured. Unknown or
  misspelled keys are **ignored**, never matched loosely, so a typo cannot
  enable a different flag.
- The override only ever forces a flag **on**. It cannot turn one off.
- It is honoured **only** when `NODE_ENV` is `development` or `test`, and is
  refused when the deploy env is `production` or `uat` — two independent signals,
  because a production deployment can be built with a non-production `NODE_ENV`.
- `NODE_ENV` is an **allowlist**, not "not production". `NODE_ENV=uat` with an
  unset deploy env otherwise slipped through: it is not `production`, so a
  denylist passed it, and it is neither `test` nor `development`, so
  `shouldUseRemoteFlags()` fell through to the deploy env — which resolves to
  `development` when unset and selects the local adapter. Permitted override plus
  local adapter meant a gate could be forced on in a UAT runtime. The deploy env
  stays a denylist because it is optional and usually unset locally.
- The check is an **explicit environment check**, not an inference from which
  adapter is in play. `getDefaultFlagAdapter()` falls back to the local adapter
  whenever the PostHog client is missing, and that fallback is reachable in
  production, so "we are on the local adapter" does not mean "we are local".
- It is a **development affordance, not flag QA**. It says nothing about whether
  PostHog would return true for a given person: percentage rollouts, role
  targeting, and the session-less `<env>:anonymous` bucketing are only
  observable in UAT.

Implementation: `src/lib/flags/local-flag-overrides.ts`.
`GATHERSYSTEM_REGISTRATION_OVERRIDE` predates this and still works —
`/register` consumes it outside the adapter because it serves signed-out
visitors, and `npm run test:e2e:gathersystem` depends on it.

### Capturing screenshots for a PR

With the dev server booted as above and local data seeded (`npm run dev:seeded`):

```bash
npm run screens:capture -- --routes /check-in --role admin \
  --widths 375,1280 --expect-text "Not checked in" --label door
```

`--role guardian` signs in as the seeded Johnson Family household (#446) and
links the auth user to it, so guardian captures land on `/household` instead of
being redirected to `/register`. That household needs a registration row for the
active cycle; without one the redirect fires and `--expect-text` fails the run
rather than saving the wizard.

Local only — it refuses production and UAT with no opt-in. `--expect-text`
asserts a marker unique to the flag-gated UI and **fails instead of saving** when
the dev server was started without the flag, which otherwise files a screenshot
of the legacy screen as evidence for the new one. Output lands in `.screenshots/`
(gitignored); attach the PNGs to the PR, never commit them.

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
