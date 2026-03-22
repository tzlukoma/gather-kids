# Eval: Smoke Tests — With Skill

## Prompt
`/e2e smoke`

## Steps Taken

1. **Arg expansion**: Bare word `smoke` recognized as partial filename → expanded to `e2e/smoke-test.spec.ts`.
2. **Setup steps**: All skipped (Supabase running, symlink exists, .env present, server running).
3. **Run tests**: `npx dotenv-cli -e .env.e2e.local -- npx playwright test --config=e2e.config.ts --project=chromium e2e/smoke-test.spec.ts`

## Test Results

```
Running 2 tests using 1 worker

  ✓  Basic E2E Smoke Test > can navigate to create account page (1.5s)
  ✓  Basic E2E Smoke Test > can navigate to registration page (1.3s)

  2 passed (2.8s)
```

## Playwright Command Used
```bash
npx dotenv-cli -e .env.e2e.local -- npx playwright test --config=e2e.config.ts --project=chromium e2e/smoke-test.spec.ts
```

## Duration
2.8s total test time
