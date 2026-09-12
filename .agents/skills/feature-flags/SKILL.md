---
name: feature-flags
description: >
  gatherKids remote feature flags (PostHog) and env toggles. Use when
  gating GatherSystem UI, adding getBoolean/getVariant call sites, or
  changing PostHog analytics/flag wiring.
---

# Feature flags

Follow [`AGENTS.md`](../../../AGENTS.md) and [`docs/FEATURE_FLAGS.md`](../../../docs/FEATURE_FLAGS.md). That doc is canonical for architecture, keys, privacy, and PostHog UI setup.

## Quick rules

1. **Remote flags** → `import { getBoolean, getVariant } from '@/lib/flags'` on the **server only**.
2. **Env toggles** (login magic/password, drafts, etc.) → keep `src/lib/featureFlags.ts` / `useFeatureFlags()`.
3. Default GatherSystem call sites to **legacy off**: `await getBoolean('gathersystem_door', false, { userId, role })`.
4. Never pass email, name, or child/household ids into flag context.
5. Never use a flag as authorization.
6. Do not enable browser PostHog flag fetches (`advanced_disable_feature_flags` stays true).
7. Production PostHog flips and project/secret changes are **Thomas-only** — escalate.

## When implementing a gated surface

- Evaluate in a Server Component or route handler; pass the boolean/variant into client UI as props if needed.
- Add or extend unit tests with a injected `createFlagEvaluator` mock; mock `server-only` and `posthog-node` if importing the real module.
- Name new keys clearly; update `GATHERSYSTEM_FLAG_KEYS` / `docs/FEATURE_FLAGS.md` in the same PR when adding GatherSystem keys.

## Verification

```bash
npx eslint src/lib/flags/** __tests__/lib/flags.test.ts
npm run typecheck
# CI test job is the Jest gate for flags tests on this machine when local ts-jest fails
```
