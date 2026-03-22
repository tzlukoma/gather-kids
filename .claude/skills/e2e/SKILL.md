---
name: e2e
description: >
  Runs the Playwright e2e test suite for the gather-kids Next.js app. Use this
  skill whenever the user asks to "run e2e tests", "run playwright", "run the
  end-to-end tests", or any variation. Also trigger it when asked to verify
  there are no regressions after a code change, or when the user types /e2e.
  The skill handles all setup automatically: starting Supabase, symlinking
  node_modules into the worktree, generating .env.e2e.local, and starting the
  dev server — then cleans up after itself.
---

# E2E Test Runner — gather-kids

## Constants

```
MAIN_REPO=/Users/Thomas/DEV/source_code/_currentProjects/gather-kids
WORKTREE=$(pwd)   # wherever Claude Code is currently running from
PORT=9002
ENV_FILE=.env.e2e.local
```

## Step 1 — Ensure Supabase is running

Run from MAIN_REPO:

```bash
cd "$MAIN_REPO" && supabase status --output env 2>&1
```

- If the output contains `API_URL=`, Supabase is up — extract `ANON_KEY` and `SERVICE_ROLE_KEY` and continue.
- If not running, run `supabase start`. If that fails with a port conflict message like "Bind for 0.0.0.0:54322 failed", extract the project id from the error (`supabase stop --project-id <id>` is shown in the error) and stop it first, then retry `supabase start`.

## Step 2 — Ensure node_modules symlink exists in the worktree

If the worktree is not the main repo (i.e. `$WORKTREE != $MAIN_REPO`), check whether `$WORKTREE/node_modules` exists. If not, create a symlink:

```bash
ln -s "$MAIN_REPO/node_modules" "$WORKTREE/node_modules"
```

This is necessary because Turbopack resolves packages relative to the project root, and worktrees don't inherit node_modules automatically.

## Step 3 — Ensure .env.e2e.local exists

If `$WORKTREE/.env.e2e.local` does not exist, create it from the Supabase status output (captured in Step 1):

```
BASE_URL=http://localhost:9002
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<ANON_KEY from supabase status>
SUPABASE_SERVICE_ROLE=<SERVICE_ROLE_KEY from supabase status>
MAILHOG_API=http://127.0.0.1:54324/api/v2
```

If the file already exists, leave it as-is.

## Step 4 — Ensure the dev server is running

Check whether the app is already up:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT
```

- If the response is `200`, the server is already running — set `DEV_SERVER_STARTED=false` and continue.
- If not, start it **from the main repo** (not the worktree — Turbopack panics when started from a directory with symlinked node_modules):

```bash
cd "$MAIN_REPO" && npm run dev > /tmp/gather-kids-dev.log 2>&1 &
DEV_SERVER_PID=$!
DEV_SERVER_STARTED=true
```

Then poll until ready (up to 60 s, checking every 3 s):

```bash
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT)
  [ "$STATUS" = "200" ] && break
  sleep 3
done
```

If the server never responds with 200 after 60 s, report the last lines of `/tmp/gather-kids-dev.log` and abort.

## Step 5 — Run the tests

From the worktree directory, run Playwright via dotenv-cli (use `npx dotenv-cli`, not the bare `dotenv` command):

```bash
cd "$WORKTREE"
npx dotenv-cli -e $ENV_FILE -- \
  npx playwright test --config=e2e.config.ts --project=chromium $EXTRA_ARGS
```

`$EXTRA_ARGS` comes from whatever the user passed after `/e2e`. Examples:

| User invocation | `$EXTRA_ARGS` |
|---|---|
| `/e2e` | _(empty — run all tests)_ |
| `/e2e smoke` | `e2e/smoke-test.spec.ts` |
| `/e2e --grep "registration"` | `--grep "registration"` |
| `/e2e auth-registration` | `e2e/auth-registration.spec.ts` |

When the user passes a bare word (not a flag), treat it as a partial filename and expand it to the matching spec file under `e2e/`.

## Step 6 — Report results

Print the Playwright summary clearly. Highlight:
- Total passed / failed / skipped
- Names of any failing tests and their error messages
- Whether there are regressions compared to what the user expected

If tests failed, offer to investigate and fix them.

## Step 7 — Cleanup

If `DEV_SERVER_STARTED=true`, kill the dev server:

```bash
kill $DEV_SERVER_PID 2>/dev/null
pkill -f "next dev.*$PORT" 2>/dev/null
```

Do not kill a server the user was already running before the skill started.
