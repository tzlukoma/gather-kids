# M'Baku UAT Fixtures Script

**Purpose:** Lightweight seed script for M'Baku (admin bot) to create repeatable UAT test scenarios on Pattern A Previews.

**Status:** UAT-only; hard-gated off production

## What it creates

This script creates three specific fixture types for testing:

### 1. Bot-guardian household

- **Household:** M'Baku Bot Family
- **Email:** `mbaku+bot@gatherkids.test`
- **Children:** 2 children (Shuri Bot, T'Challa Bot)
- **Enrollments:** Both children enrolled in Bible Bee

### 2. Dual-cycle + essays fixture

- **Household:** Dual-Cycle Test Family
- **Email:** `mbaku+dual@gatherkids.test`
- **Children:** 1 senior division student (Ramonda Test, grade 10)
- **Cycles:** Active Bible Bee cycle plus newest prior (not `is_active` only)
- **Purpose:** Product investigation for dual-year / last-year-essay scenarios
- **Note:** Seed data only, no UI filter (per requirements). Warns if fewer than 2 cycles exist.

### 3. Resettable test household

- **Household:** Reset Test Family
- **Email:** `mbaku+reset@gatherkids.test`
- **Children:** 1 child (Erik Reset, grade 3) enrolled in Bible Bee
- **Prefix:** All IDs use `mbaku_` for easy reset

## Prerequisites

Before running this script, ensure:

1. UAT environment is set up with `.env.uat`
2. Active registration cycle exists
3. Bible Bee ministry exists (run `npm run seed:uat` first if needed)
4. At least two Bible Bee cycles exist (active + a prior year) so fixture 2 can enroll dual-cycle (run `npm run seed:uat:bible-bee` first if needed)

## Usage

### Standard (idempotent)

```bash
npm run seed:uat:mbaku
```

### Reset mode (delete and re-seed)

```bash
npm run seed:uat:mbaku:reset
```

### Dry run (validate without executing)

```bash
npm run seed:uat:mbaku:dry
```

### Direct invocation

```bash
# Using UAT environment variables (Supabase URL must contain uat, staging, or localhost)
DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js

# Reset mode
RESET=true DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
```

`--uat` alone does **not** confirm UAT. The script only runs when the Supabase URL contains `uat`, `staging`, or `localhost`, OR when the URL contains an allowlisted UAT project ref (see Production safety section). The flag cannot authorize a non-UAT remote URL.

## Production safety

The script is **hard-gated off production** and will refuse to run if:

1. The Supabase URL contains known production project references (production blocklist)
2. The Supabase URL does not contain `uat`, `staging`, or `localhost` AND is not in the UAT project allowlist (`--uat` alone is not enough)
3. Required UAT environment variables are missing

### UAT project allowlist

The script maintains an allowlist of known UAT Supabase project references that are explicitly authorized to run this seed script:

- **`gekouvbeujfkiaorshim`** - UAT Preview project ref

If your UAT Supabase URL contains one of these project refs, the script will run even if the URL hostname doesn't contain "uat", "staging", or "localhost".

#### Adding more UAT project refs to the allowlist

To add a new UAT project reference:

1. Open `scripts/uat/mbaku-fixtures.js`
2. Locate the `UAT_PROJECT_ALLOWLIST` array (near the top of the file)
3. Add the project ref as a new string in the array with a descriptive comment:

```javascript
const UAT_PROJECT_ALLOWLIST = [
	'gekouvbeujfkiaorshim', // UAT Preview project ref
	'your-new-uat-ref-here', // Description of this UAT environment
	// Add more UAT project refs here as needed
];
```

**IMPORTANT:** Never add the production project ref (`loekqsjtvvuuigxwavyq`) to this allowlist. The production blocklist takes precedence and will block execution regardless of allowlist entries.

### Production blocklist

The following project references are **hard-blocked** and will refuse to run:

- **`loekqsjtvvuuigxwavyq`** - Production project ref (NEVER run against this)
- `qjjvfxwcyipdifzqpnsy.supabase.co` - Production Supabase project
- `gather-kids-production`
- `prod.supabase`

The production blocklist takes precedence over all other checks, including the UAT allowlist.

## Reset behavior

When `RESET=true`, the script:

1. Deletes all student essays with `mbaku_` prefix
2. Deletes all essay prompts with `mbaku_` prefix
3. Deletes all Bible Bee enrollments with `mbaku_` prefix
4. Deletes all ministry enrollments with `mbaku_` prefix
5. Deletes all registrations with `mbaku_` prefix
6. Deletes all children with `mbaku_` prefix
7. Deletes all guardians with `mbaku_` prefix
8. Deletes all emergency contacts with `mbaku_` prefix
9. Deletes all user_households with `mbaku_` prefix
10. Deletes all households with `mbaku_` prefix
11. Re-creates all fixtures from scratch

## Fixture IDs

All created records use the `mbaku_` prefix for easy identification and cleanup:

- Households: `mbaku_bot_household`, `mbaku_dual_household`, `mbaku_reset_household`
- Children: `mbaku_bot_child_1`, `mbaku_bot_child_2`, `mbaku_dual_child_senior`, `mbaku_reset_child`
- Enrollments: `mbaku_<child_id>_bible_bee`
- Bible Bee enrollments: `mbaku_bee_<child_id>`

## Integration with existing UAT workflow

This script is designed to complement (not replace) the main UAT seed script:

1. Run `npm run seed:uat` first to create ministries, cycles, and base data
2. Run `npm run seed:uat:bible-bee` to create Bible Bee structure
3. Run `npm run seed:uat:mbaku` to add M'Baku fixtures

## Notes

- The script is idempotent by default (safe to re-run)
- All operations use direct Supabase calls via service role key
- Follows existing seed script patterns from `dev_seed.js` and `uat_seed.js`
- Uses synthetic test data only
- No real family data is used or exposed
