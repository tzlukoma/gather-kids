# R1 UAT Smoke Test — Vercel Preview (~10 minutes)

Use this **after** the PR’s Vercel Preview deploy is green. Automated coverage (41 Jest + 24 Playwright + SQL) already ran in CI/agent; this is your **human confirmation** on the real preview URL before approving merge to `main` and prod deploy.

**Prerequisites**

- Fall **2026** is **active** on UAT Supabase (Fall 2025 inactive) — same as agent Phase 3.
- Test accounts exist on UAT (see `.r1-local/manifest.example.json`; credentials in your local `manifest.json`, never commit).
- Preview URL from the PR (e.g. `https://gather-kids-….vercel.app`).

**Optional agent re-check against preview** (read-only, no submit):

```bash
R1_E2E_ENABLED=1 BASE_URL=https://YOUR-PREVIEW.vercel.app \
  npx playwright test e2e/r1/ --grep-invert @mutating --config=e2e.config.ts
```

---

## Checklist

| # | Step | Expected | ✓ |
|---|------|----------|---|
| 1 | Open preview `/login`, sign in as **returning guardian** (`parent-with-household@example.com`) | Lands on `/register` or `/household` (if already registered this cycle) | |
| 2 | Go to `/register` | Form loads (not stuck on spinner); “You are signed in as: …” | |
| 3 | Returning household | Street address + children prefilled; **consents unchecked** | |
| 4 | Grade hints | “Last year: … → Suggested this year: …” on children (if not already registered for active cycle) | |
| 5 | Scroll to **Choirs** | Group Yes/No required when choir section visible | |
| 6 | Check **Liability** + **Photo**; answer choir group consent; check any `* Consent` boxes shown | Submit button enabled | |
| 7 | **Submit Registration** | Success toast → redirect **`/household`** | |
| 8 | `/household` | Children / registration year visible; no redirect back to `/register` | |
| 9 | Sign out; open `/register` | Redirect to `/login?next=%2Fregister` | |
| 10 | Sign in as **new guardian** (`brand-new@example.com`) | `/register`; empty address; email prefilled on guardian | |

---

## Sign-off

| Item | Value |
|------|--------|
| Preview URL | |
| Fall 2026 cycle id | `b68d82e0-9677-4703-a89d-264661c88e97` |
| Test household id | `7dfcf04f-38ee-4e24-abf4-62e3c9c554b5` |
| Tester | |
| Date | |
| Result | ☐ Pass → approve PR merge ☐ Fail → note in PR |

---

## After merge to `main`

1. UAT app deploys from `main` (existing pipeline).
2. Prod: ensure **inactive** Fall 2026 row exists **before** prod app deploy (see `R1_IMPLEMENTATION_PLAN.md` Phase 4).
3. Do **not** flip prod cycle active until you’re ready to open registration to families.
4. Optional: run `./scripts/r1/phase3-validate.sh` locally against UAT if you changed data during smoke.

---

## Failures

| Symptom | Check |
|---------|--------|
| Empty prefill | `user_households` row + Fall 2025 enrollments on UAT |
| Stuck loading | Preview env vars point at UAT Supabase |
| Submit stays on form | Choir group consent + optional ministry consents |
| `/household` → `/register` loop | Fall 2026 enrollments missing after submit — check admin registrations |

See `docs/R1_IMPLEMENTATION_PLAN.md` Appendix A.
