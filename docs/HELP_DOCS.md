# In-app user guide (`/help`)

End-user help lives in the Next.js app at **`/help`**. It ships with every Vercel production deploy. There is no separate Docusaurus or GitHub Pages site.

## URLs

| URL | Content |
|-----|---------|
| `/help` | Guide home (no login) |
| `/help/getting-started` and other sidebar routes | Markdown articles in `content/help/` |
| `/help/releases` | Release index from `CHANGELOG.md` |
| `/help/releases/v1.8.1` | User-facing `feat` / `fix` items for that version |

The header shows **User guide · v{version}** from `package.json`.

## Edit a guide page

1. Edit the matching file under `content/help/` (same path as the URL after `/help/`).
2. Keep internal links as `/help/...` (not relative Docusaurus paths).
3. Screenshots go in `public/help/screenshots/` and are referenced as `![alt](/help/screenshots/file.png)`.
4. Run `npm run docs:validate`.

Sidebar labels live in `src/lib/help/sidebar.ts`. Add a new article there **and** as a markdown file.

## Release notes

Do not hand-edit `doc-site/releases/` (removed). [release-please](https://github.com/googleapis/release-please) writes `CHANGELOG.md` on `main`. `/help/releases` parses that file.

- Shown: **Features** and **Bug Fixes**, except scopes `ci`, `chore`, `test`, `build`, `docs`.
- Duplicate squash-merge lines are collapsed.
- Smoke: `npm run help:parse-changelog`

## Screenshots (Playwright, synthetic data only)

**Capture locally** against seeded local Supabase. Do **not** point the script at production (`gatherkidslive.com`) or at UAT unless UAT was fully reset to synthetic seed data.

```bash
# local stack already reset + seeded
npm run dev                 # http://localhost:9002
npm run help:capture-screenshots
```

The script:

- Aborts on production hosts and on non-local `BASE_URL` / Supabase unless `HELP_SCREENSHOT_ALLOW_UAT=1`
- Scans page text for non-`@example.com` emails (plus known seed domain `morethanahut.com`) and non-555 phone patterns
- Writes PNGs to `public/help/screenshots/` (viewport 1280×800)

Accounts (local seed / capture script):

- Admin: `admin@example.com` / `TestPassword123!`
- New-family guardian (no household link): `new-family@example.com`
- Returning guardian (Smith household, no current-cycle registration): `parent-with-household@example.com`
- Household guardian (Johnson household, current-cycle registrations + prior-year enrollments): `household-complete@example.com`

The capture script seeds a prior registration cycle, Johnson `registrations` rows, Bible Bee divisions/scriptures/enrollments, and the auth users above. It **fails** if Family Registration Form, Welcome Back, Children Information, household accordion, Edit Child, or populated Bible Bee UI is missing — it does not save a blank or wrong screen.

Reviewer: spot-check every committed PNG for PII before merge.

Re-running the script overwrites the same filenames. Small pixel diffs from fonts/timing are acceptable; do not chase pixel-perfect CI.

There is **no** auto-capture on pull requests (slow/flaky). Optional UAT capture requires an explicit synthetic reset and `HELP_SCREENSHOT_ALLOW_UAT=1`.

## Validation (CI)

`npm run docs:validate` (`scripts/validate-help.mjs`) checks:

- Sidebar slugs have markdown files
- Internal `/help/...` article links resolve
- Markdown screenshot paths exist on disk
- `CHANGELOG.md` parses to at least one release

CI job **docs** runs this on every PR.

## Retired

- `doc-site/` (Docusaurus)
- `.github/workflows/deploy-docs.yml`
- GitHub Pages URL `https://tzlukoma.github.io/gather-kids/`

Operator/dev docs remain under `docs/` (for example `docs/ADMIN_USER_GUIDE.md`). They are not part of `/help`.
