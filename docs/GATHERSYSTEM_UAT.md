# GatherSystem UAT checklist

The test cases a person or a bot runs in **UAT** before a GatherSystem flag is raised in production. Each round of testing is tracked in its own GitHub issue that links here; this file is the reusable list, so it should change only when a screen changes.

- Flags, their routes and their prerequisites: [`FEATURE_FLAGS.md`](FEATURE_FLAGS.md)
- Parent project: #367

## Contents

1. [Before you start](#before-you-start)
2. [Rules for testers](#rules-for-testers)
3. [What is out of scope](#what-is-out-of-scope)
4. Test cases: [Door](#door--gathersystem_door) · [Staff shell and admin](#staff-shell-and-admin--gathersystem_admin) · [Incidents](#incidents--gathersystem_incidents) · [Guardian home and child](#guardian-home-and-child--gathersystem_guardian) · [Child Bible Bee](#child-bible-bee--gathersystem_bible_bee_household) · [Registration](#registration--gathersystem_registration) · [Create account](#create-account--gathersystem_account_entry) · [Onboarding and unauthorized](#onboarding-and-unauthorized--gathersystem_auth) · [Across screens](#across-screens)
5. [Turning a flag off (Thomas)](#turning-a-flag-off-thomas)
6. [Reporting](#reporting)

---

## Before you start

Thomas confirms these on the round's issue before testing begins.

| # | Check |
|---|---|
| 1 | The **UAT URL** for this round, from the summary of the latest **UAT release** workflow run (`https://….vercel.app`). Use only that URL. |
| 2 | `/api/version` on that URL returns `deployEnv: "uat"`. If it says anything else, stop. |
| 3 | In PostHog, every flag being tested has a `deploy_env = uat` condition at **100%**. Flags that are off show the legacy screen, which is not what is being tested. |
| 4 | Test accounts exist in UAT for each role below, and their passwords have been given to the tester through a secret store (for example `UAT_BOT_EMAIL` / `UAT_BOT_PASSWORD`), never in an issue, a doc or a prompt. |
| 5 | Whether UAT still holds a **restore of production data**. If it does, staff screens (door, rosters, incidents) show real families, so Thomas either accepts that on the round's issue or the Admin and Ministry leader cases are skipped. |
| 6 | An active registration cycle, an active Bible Bee cycle with scriptures, and at least two open check-in events exist in UAT. |
| 7 | For the magic-link cases (ACCT): the tester has an inbox that UAT can send to. Without one, skip those cases and say so. |

### Accounts

| Role | Needed for | What the account needs |
|---|---|---|
| **Admin** | Door, admin, incidents, events | `app_metadata.role = ADMIN` |
| **Ministry leader** | Door, rosters, incidents | `app_metadata.role = MINISTRY_LEADER`, assigned to at least one ministry |
| **Guardian A** | Guardian, child, Bible Bee | Household with 2+ children, at least one in a Bible Bee scripture division |
| **Guardian B** | Bible Bee essay | A child in an essay division (`mbaku+dual@gatherkids.test` fits; see [`UAT_MBAKU_FIXTURES.md`](UAT_MBAKU_FIXTURES.md)) |
| **New family** | Registration, create account | An address with no account yet, or a fresh one per round |
| **Returning family** | Registration prefill | Registered last cycle, not yet this cycle |

### Screen sizes

Run every case at **desktop 1440 × 900**. Run the cases marked 📱 again at **phone 390 × 844**. Run `DOOR-12` at **320** wide.

---

## Rules for testers

- **UAT only.** Never open the production site (`gatherkidslive.com`) during a round.
- **Synthetic data only.** Change only the synthetic records named on the round's issue. UAT may also hold a restore of real family data: do not open, copy or screenshot any other family's details, and crop screenshots to the record under test. Never type a real person's name, email, phone number or medical detail. For photo uploads, use a plain illustration, never a photo of a real person.
- **Use the app, not the database.** Do not call Supabase, the API or the browser console directly.
- **Allowed changes,** through the app on synthetic records only: check-in and check-out, transfer, logging and acknowledging an incident, marking a scripture memorized and back, editing a child's details and changing them back, registering a new synthetic family, and creating an event whose name starts with `UAT test`, archived when done.
- **Not allowed:** deleting anything; Users and role changes; Branding; editing a ministry or its consents; turning flags on or off; importing data.
- **Undo what you change** where the app allows it, and note anything you could not undo.
- **Stop and report** instead of working around anything that looks like real family data, a production URL, or an error that blocks a whole screen.

---

## What is out of scope

These are known to still use the old screens, so do not report them as bugs:

- `/login`, waiting on the decision in #379
- `/household/profile` and the household Bible Bee list at `/household/bible-bee` (#378)
- Bible Bee admin under `/bible-bee` (#376)
- `/users`, `/registrations`, help pages
- Any screen whose flag is off in UAT for this round. The round's issue lists which flags are on.

---

## Test cases

Each case has an ID for reporting. "Expected" is what passes; anything else is a finding.

### Door — `gathersystem_door`

Route: `/check-in`. Sign in as **Admin**, then repeat DOOR-01 to DOOR-07 as **Ministry leader**.

| ID | Steps | Expected |
|---|---|---|
| DOOR-01 📱 | Open `/check-in`. | The new door, with stat cards, status tabs (All / Checked in / Not checked in) with counts, a search box and a list of children with photos or initials. No error. |
| DOOR-02 | Change the event (the **Change Event** dialog) to another open event. Reload. | The list and counts update for that event, and it is still selected after the reload. |
| DOOR-03 📱 | Search by a child's first name, then a household name. Clear the search. | Matching children only; clearing brings back the full list. |
| DOOR-04 | Check in one child who is not checked in. | Their row moves to checked in, the counts change by one, and the row says which event they are in (for example "In Kids Church"). |
| DOOR-05 📱 | Select two or more children, or use select-all, and check them in from the bottom bar. | All selected children are checked in; the selection clears. |
| DOOR-06 | On a checked-in child, use **Transfer**, pick another open event and confirm. | The child is now in the new event; the counts for both events are right. |
| DOOR-07 📱 | Check a child out. | They show as not on site and the counts update. |
| DOOR-08 | Open the guardian/contact details on a child. | Guardians with relationship and phone, the emergency contact, and self check-out eligibility, all matching the child's record. |
| DOOR-09 | For a child with an allergy or an open incident, look at their row and open the incident chip. | The allergy and incident chips show; the incident opens with the right details. |
| DOOR-10 | Update a child's photo with an illustration and save. | The crop preview is square, and the saved photo shows square on the row. |
| DOOR-11 | Open `/check-in?filter=checked-in`, then `/check-in?filter=nonsense`. | The first opens on the checked-in tab. The second shows the full list without crashing (#456 tracks telling the user the filter was not understood). |
| DOOR-12 | At 320 wide, look at the status tabs. | The tab labels do not overlap. |
| DOOR-13 | After 8pm US Eastern, check a child in, then reload. | The check-in still shows for today. Skip if not testing in the evening. |

### Staff shell and admin — `gathersystem_admin`

Sign in as **Admin**.

| ID | Steps | Expected |
|---|---|---|
| ADM-01 | Look at the left navigation on any staff page. | Grouped navigation in the GatherSystem style. Every link opens its page with no error. |
| ADM-02 | Open `/admin-overview`. | The admin dashboard: headline numbers, recent incidents and links to Emergency snapshot, Open check-in and Reports. |
| ADM-03 | Use each dashboard link. | Each opens the right page. |
| ADM-04 | Open `/rosters`, switch events and filters. | A dense staff table. The status for a checked-in child names the event they are in. |
| ADM-05 | From the roster, transfer a checked-in child. | Same result as DOOR-06. |
| ADM-06 | Open `/leaders` and one leader's page. | The list and the detail page load in the GatherSystem style. Read only; save nothing. |
| ADM-07 | Open `/ministries`. | The ministry list loads. Read only. |
| ADM-08 | Open `/reports`. Export the attendance report for the last 7 days, then the emergency snapshot. | Both files download and contain synthetic names only. Exporting attendance with no date range asks for one. |
| ADM-09 | Open `/events`, add an event named `UAT test <date>`, rename it, then archive it. | Each step succeeds. An event that has attendance history offers Archive, not Delete. |
| ADM-10 | Sign in as **Ministry leader** and look at the navigation. | Only the pages a leader may use appear, and admin-only pages refuse access. |

### Incidents — `gathersystem_incidents`

Route: `/incidents`. Skip this section if the flag does not exist or is off in UAT.

| ID | Steps | Expected |
|---|---|---|
| INC-01 | As **Admin**, open `/incidents`. | The incident log with filters for severity, status, date range and past cycles. |
| INC-02 | Log a new incident for a synthetic child with severity Low and a short invented description. | It appears in the log as Pending. No message promises an admin notification. |
| INC-03 | Open the incident and acknowledge it. | The detail dialog shows the right child, severity and description; after acknowledging, the status is Acknowledged. |
| INC-04 | Try each filter, including **Include past cycles**. | The list narrows correctly; clearing the filters brings it back. |
| INC-05 | As **Ministry leader**, open `/incidents`. | The leader sees only incidents in their scope, not every incident. |

### Guardian home and child — `gathersystem_guardian`

Sign in as **Guardian A**.

| ID | Steps | Expected |
|---|---|---|
| GRD-01 📱 | Open `/household`. | A greeting, then one card per child with an on-site pill and, for a Bible Bee child, scripture progress that never shows more than 100%. |
| GRD-02 | While one of their children is checked in (use DOOR-04 as Admin first), reload `/household`. | That child shows On site; the others show Not checked in. |
| GRD-03 📱 | Use **View full household**. | `/household/details` opens with the household record. |
| GRD-04 📱 | Open a child's page, `/household/children/<id>`. | Header with photo or initials, then Today, Medical & care, Program enrollments, and Pickup & safety. |
| GRD-05 | With that child checked in, look at **Today**. | It shows the event name and the check-in time in Eastern time. It does not name the staff member. |
| GRD-06 | Use **Edit profile**, change a detail, save, then change it back. | Both saves succeed and the page shows the change each time. |
| GRD-07 | Use **Update photo** with an illustration. | Square crop preview; the photo saves. |
| GRD-08 | In Program enrollments, use **View progress** on Bible Bee. | Opens that child's Bible Bee page. |
| GRD-09 | Change the URL to a child id from another household (ask Thomas for one). | Access is refused, and nothing from the other family shows. |

### Child Bible Bee — `gathersystem_bible_bee_household`

Route: `/household/children/<id>/bible-bee`.

| ID | Steps | Expected |
|---|---|---|
| BBH-01 📱 | As **Guardian A**, open the Bible Bee page of a scripture-division child. | The scripture list with To memorize / Memorized / All tabs, translation chips and the year selector. |
| BBH-02 📱 | Mark one scripture memorized, then mark it back. | It moves between tabs, and the progress count changes by one each time. |
| BBH-03 | Switch translations. | The scripture text changes to that translation. |
| BBH-04 | Switch to the All tab and back. | Counts on each tab add up. |
| BBH-05 | As **Guardian B**, open the essay-division child's page. | The essay card shows the prompt, and **Upload Essay** opens the upload form. Do not submit. |

### Registration — `gathersystem_registration`

Route: `/register`. CI already runs the full browser test suite for this flag (`e2e/gathersystem-registration-*.spec.ts`), so UAT checks the real environment end to end.

| ID | Steps | Expected |
|---|---|---|
| REG-01 📱 | As **New family**, sign in and open `/register`. | The wizard: household → guardians → children → ministries → consents → done, with a step indicator. Buttons stay reachable on a phone. |
| REG-02 📱 | Complete every step with invented details. Leave a guardian email blank. Give one child an allergy. | Each step only lets you continue when it is complete, and the errors say what is missing. A blank guardian email is accepted. The allergy is required to be stated. |
| REG-03 | In ministries, check that each ministry lists only the children eligible by grade. Answer a ministry's custom question. | Only eligible children appear; the custom answer is kept on Review. |
| REG-04 | In consents, look for the choir group consent and any conditional consents. | The ones that apply appear, and the wizard won't submit until they're answered. |
| REG-05 | Leave mid-wizard, come back to `/register`. | The draft is restored. |
| REG-06 📱 | Submit. | The done screen names the cycle, and `/household` then shows the children. |
| REG-07 | As **Returning family**, open `/register`. | The household and children are prefilled with grade hints; consents start unchecked. |
| REG-08 | Signed out, open `/register`. | Redirected to `/login`, and back to `/register` after signing in. |

### Create account — `gathersystem_account_entry`

Route: `/create-account`. Signed out. Needs the inbox from Before you start #7.

| ID | Steps | Expected |
|---|---|---|
| ACCT-01 📱 | Open `/create-account`. | An email-only form, no password field. |
| ACCT-02 | Enter a new address and submit, then open the magic link. | A new family is asked to set a password, then lands on `/register`. |
| ACCT-03 | Repeat with **Guardian A**'s address. | They land on their household, not on registration. |
| ACCT-04 | Repeat with the **Admin** address. | They land on their staff page. |

### Onboarding and unauthorized — `gathersystem_auth`

Skip this section if the flag does not exist or is off in UAT.

| ID | Steps | Expected |
|---|---|---|
| AUTH-01 | As a user who must set a password, open `/onboarding`. | The New Password and Confirm Password form in the GatherSystem type scale; mismatched passwords are refused with a clear message. |
| AUTH-02 | As **Guardian A**, open a staff page such as `/rosters`. | Sent to `/unauthorized`, styled to match, with a way back. |

### Across screens

| ID | Steps | Expected |
|---|---|---|
| X-01 | On every screen tested, open the browser's console. | No red errors. List any that appear. |
| X-02 | Use only the keyboard on the door, the wizard and the guardian home. | Every control can be reached and used, and focus is visible. |
| X-03 | Note anything that takes more than about 3 seconds to load. | Report it with the page and the time. |

---

## Turning a flag off (Thomas)

Once per flag per environment, before production: set the flag's UAT condition to 0%, reload its screen and confirm the legacy screen appears with nothing missing, then set it back to 100%. This proves the off switch works without a redeploy. Testers do not do this.

---

## Reporting

On the round's GitHub issue:

- **One comment per section** when it is done: the IDs that passed, failed or were skipped, with a reason for each skip.
- **One new issue per failure,** titled `uat(<flag>): <what is wrong>`, linking the round's issue. Include the case ID, steps, expected versus actual, screen size, the account's role (not its email), the time in US Eastern, and a screenshot. Screenshots must show synthetic data only.
- **Blocked?** Comment on the round's issue and mention `@tzlukoma`.

A flag is ready for production when every case in its section has passed or has an agreed reason to skip, and its failures are fixed and retested.
