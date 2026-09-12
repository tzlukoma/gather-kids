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
- **Purpose:** Product investigation for dual-cycle + essay scenarios
- **Note:** Seed data only, no UI filter (per requirements)

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
4. Active Bible Bee cycle exists (run `npm run seed:uat:bible-bee` first if needed)

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
# Using UAT environment variables
DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js

# With explicit --uat flag
node scripts/uat/mbaku-fixtures.js --uat

# Reset mode
RESET=true DOTENV_CONFIG_PATH=.env.uat node -r dotenv/config scripts/uat/mbaku-fixtures.js
```

## Production safety

The script is **hard-gated off production** and will refuse to run if:

1. The Supabase URL contains known production project references
2. UAT indicator is not present (requires "uat", "staging", "localhost", or `--uat` flag)
3. Required UAT environment variables are missing

## Reset behavior

When `RESET=true`, the script:

1. Deletes all student essays with `mbaku_` prefix
2. Deletes all Bible Bee enrollments with `mbaku_` prefix
3. Deletes all ministry enrollments with `mbaku_` prefix
4. Deletes all registrations with `mbaku_` prefix
5. Deletes all children with `mbaku_` prefix
6. Deletes all guardians with `mbaku_` prefix
7. Deletes all emergency contacts with `mbaku_` prefix
8. Deletes all households with `mbaku_` prefix
9. Re-creates all fixtures from scratch

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
