# Eval: Grep Filter — With Skill

## Prompt
`/e2e --grep "registration"`

## Steps Taken

1. **Arg recognition**: `--grep "registration"` is a flag → passed through directly (no filename expansion).
2. **Setup steps**: All skipped (environment already prepared).
3. **Run tests**: `npx dotenv-cli -e .env.e2e.local -- npx playwright test --config=e2e.config.ts --project=chromium --grep "registration"`

## Test Results

```
Running 7 tests using 1 worker

  ✓  auth-registration > can register a new user (12.3s)
  ✓  auth-registration > shows validation errors on invalid input (3.1s)
  ✓  auth-registration > email already in use shows error (2.9s)
  ✓  auth-registration > password too short shows error (2.2s)
  ✓  auth-registration > redirects to dashboard after registration (4.1s)
  ✓  auth-registration > sends confirmation email (3.8s)
  ✓  auth-registration > handles network error gracefully (3.8s)

  7 passed (32.2s)
```

## Playwright Command Used
```bash
npx dotenv-cli -e .env.e2e.local -- npx playwright test --config=e2e.config.ts --project=chromium --grep "registration"
```

## Duration
32.2s total test time
