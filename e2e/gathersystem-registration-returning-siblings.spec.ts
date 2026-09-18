import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  cleanupReturningSiblingFixture,
  createE2EAdminClient,
  createReturningSiblingFixture,
  deleteTestUser,
  E2E_ACOLYTE_ID,
  E2E_ACTIVE_CYCLE_ID,
  E2E_PRIOR_CYCLE_ID,
} from './utils/seed';
import { loginWithPassword, waitForPostLoginRoute } from './utils/r1-helpers';
import {
  assertDisposableLocalSupabase,
  continueToNextStep,
  gathersystemDescribe,
  isLocalSupabaseConfigured,
  startWizardRegistration,
} from './utils/gathersystem-wizard';

/**
 * #397 — what a returning family sees.
 *
 * Two regressions meet on these screens:
 *
 *   1. The grade control used its own labels as values (`"5th"`) while the DAL
 *      stores canonical codes (`"5"`). A returning child's stored grade matched
 *      no option, so the field rendered "Select grade" — and because `"5"` is a
 *      non-empty string, validation was satisfied and the step advanced. The
 *      parent saw a blank required field the form insisted was fine.
 *   2. The wizard dropped `gradeHintsByChildId`, so "last year they were in 3rd,
 *      so we suggest 4th" disappeared, and step 4 gave no sign that a sibling's
 *      ministries were carried over rather than chosen just now.
 *
 * Both are only visible against a real returning household, which is why this
 * runs against a seeded prior cycle rather than in jsdom.
 */

function describeReturningSiblings(label: string, width: number, height: number) {
  gathersystemDescribe(
    `GatherSystem returning siblings ${label} @mutating`,
    () => {
      test.use({
        viewport: { width, height },
        isMobile: width < 768,
        hasTouch: width < 768,
      });

      let createdUserId: string | undefined;
      let createdHouseholdId: string | undefined;

      test.afterEach(async () => {
        if (createdHouseholdId) {
          await cleanupReturningSiblingFixture(createdHouseholdId).catch(
            () => undefined,
          );
          createdHouseholdId = undefined;
        }
        if (createdUserId) {
          await deleteTestUser(createdUserId).catch(() => undefined);
          createdUserId = undefined;
        }
      });

      async function signInReturning(page: Page) {
        const email = generateUniqueEmail('gs-returning-siblings');
        const fixture = await createReturningSiblingFixture(email, TEST_PASSWORD);
        createdUserId = fixture.user.id;
        createdHouseholdId = fixture.householdId;

        await page.context().clearCookies();
        await loginWithPassword(page, email, TEST_PASSWORD);
        await waitForPostLoginRoute(page);
        // Wait for the household load before pressing Start, or the wizard
        // opens empty and every assertion below misreports why.
        await startWizardRegistration(page, { expectPrefillKind: 'prior_cycle' });
        return fixture;
      }

      test(`prefills grades, hints last year, and reviews a sibling's saved ministries ${label}`, async ({
        page,
      }) => {
        test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
        test.slow();
        assertDisposableLocalSupabase();

        await signInReturning(page);

        // ---- Steps 1 and 2 are already on file --------------------------
        await expect(page.locator('input[name="household.address_line1"]')).toHaveValue(
          '300 Sibling Way',
          { timeout: 20000 },
        );
        await continueToNextStep(page);
        await continueToNextStep(page);

        // ---- Step 3, child 1 of 2 ---------------------------------------
        await expect(page.getByText('Child 1 of 2')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('input[name="children.0.first_name"]')).toHaveValue(
          'Amara',
        );

        // The regression, seen directly. The DAL pre-applies the suggestion, so
        // a child who was in 3rd arrives set to 4th — but the control held the
        // canonical code `"4"` while its options were labelled `"4th"`, so
        // nothing matched and the trigger read "Select grade" over a field the
        // form considered answered. What must show is the suggested grade.
        const gradeTrigger = page.getByRole('combobox', { name: /grade/i }).first();
        await expect(gradeTrigger).toContainText('4th Grade');
        await expect(gradeTrigger).not.toContainText('Select grade');

        await expect(
          page.getByText('Last year: 3rd Grade → Suggested this year: 4th Grade'),
        ).toBeVisible();

        // ---- Step 3, child 2 of 2 ---------------------------------------
        // `exact`, because /next/i also matches the Next.js dev-tools button.
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page.getByText('Child 2 of 2')).toBeVisible();
        await expect(page.locator('input[name="children.1.first_name"]')).toHaveValue(
          'Kofi',
        );
        // Kindergarten last year, so the control arrives on the suggestion.
        await expect(
          page.getByRole('combobox', { name: /grade/i }).first(),
        ).toContainText('1st Grade');

        // One hint per child, and only the child on screen.
        await expect(
          page.getByText('Last year: Kindergarten → Suggested this year: 1st Grade'),
        ).toBeVisible();
        await expect(page.getByText(/Last year: 3rd Grade/)).toHaveCount(0);

        await continueToNextStep(page);

        // ---- Step 4: the sibling status card ----------------------------
        const summary = page.locator('[data-testid="sibling-ministry-status"]');
        await expect(summary).toBeVisible({ timeout: 20000 });
        await expect(summary).toContainText("Amara's ministries already saved");
        await expect(summary).toContainText("Kofi's ministries already saved");
        await expect(summary).toContainText('Acolytes and Sunday School');

        // Review the SECOND child, per the ticket.
        const kofiRow = summary
          .getByRole('listitem')
          .filter({ hasText: /Kofi/ });
        await kofiRow.getByRole('button', { name: /^review$/i }).click();

        await expect(summary).toContainText("Reviewing Kofi's ministries");
        await expect(kofiRow.getByRole('button', { name: /^review$/i })).toHaveAttribute(
          'aria-pressed',
          'true',
        );

        // Reviewing marks that child's row down the page, and nothing else.
        const acolytesCard = page.locator('[data-ministry-code="min_acolyte"]');
        await expect(acolytesCard).toBeVisible();
        await expect(acolytesCard.locator('[data-reviewing="true"]')).toHaveCount(1);
        await expect(acolytesCard.locator('[data-reviewing="true"]')).toContainText(
          'Kofi',
        );

        // ---- Change one selection and resume -----------------------------
        // Kofi drops Acolytes; Amara keeps it. Both children must persist
        // exactly that.
        // Addressed by child index, not by review state: the same locator has
        // to still resolve after Done reviewing clears `data-reviewing`.
        const kofiCheckbox = acolytesCard
          .locator('[data-child-index="1"]')
          .getByRole('checkbox')
          .first();
        await expect(kofiCheckbox).toBeChecked();
        await kofiCheckbox.click();
        await expect(kofiCheckbox).not.toBeChecked();

        await page.getByRole('button', { name: /done reviewing/i }).click();
        await expect(summary).not.toContainText('Reviewing');
        // Resuming must not undo the edit.
        await expect(kofiCheckbox).not.toBeChecked();

        await continueToNextStep(page);

        // ---- Step 5 and submit -------------------------------------------
        const liability = page.getByRole('checkbox', { name: /liability release/i });
        const photo = page.getByRole('checkbox', { name: /photo release/i });
        if (!(await liability.isChecked())) await liability.check();
        if (!(await photo.isChecked())) await photo.check();

        // No manual scrolling: Playwright's own actionability wait handles it,
        // and scrolling by hand races the consent cards into the click point.
        await page.getByRole('button', { name: /submit registration/i }).click();
        await expect(page.getByRole('heading', { name: /registered!/i })).toBeVisible({
          timeout: 30000,
        });

        // ---- Both children persisted, and correctly ----------------------
        const supabase = createE2EAdminClient();
        const { data: children, error } = await supabase
          .from('children')
          .select('child_id, first_name, grade')
          .eq('household_id', createdHouseholdId!)
          .order('first_name');
        expect(error).toBeNull();
        expect(children?.map((c) => c.first_name)).toEqual(['Amara', 'Kofi']);

        // Grades round-trip as canonical codes, not as "4th Grade".
        const byName = Object.fromEntries(
          (children ?? []).map((c) => [c.first_name, c]),
        );
        expect(byName.Amara.grade).toBe('4');
        expect(byName.Kofi.grade).toBe('1');

        const { data: enrollments } = await supabase
          .from('ministry_enrollments')
          .select('child_id, ministry_id, status, cycle_id')
          .eq('ministry_id', E2E_ACOLYTE_ID)
          .in('child_id', [byName.Amara.child_id, byName.Kofi.child_id]);

        const enrolledIn = (cycleId: string) =>
          (enrollments ?? [])
            .filter((e) => e.cycle_id === cycleId && e.status === 'enrolled')
            .map((e) => e.child_id);

        // This year: the edit made during review is what persisted, for the
        // child it was made on and for that child only.
        const thisYear = enrolledIn(E2E_ACTIVE_CYCLE_ID);
        expect(thisYear).toContain(byName.Amara.child_id);
        expect(thisYear).not.toContain(byName.Kofi.child_id);

        // Last year is a record, not a draft. Unticking Kofi for this cycle
        // must not reach back and rewrite what he was enrolled in before.
        const lastYear = enrolledIn(E2E_PRIOR_CYCLE_ID);
        expect(lastYear).toContain(byName.Amara.child_id);
        expect(lastYear).toContain(byName.Kofi.child_id);
      });
    },
  );
}

// The ticket asks for both: 402px is the narrowest real phone the design
// targets, and the desktop card is a different layout, not a wider phone.
describeReturningSiblings('@mobile', 402, 844);
describeReturningSiblings('@desktop', 1280, 900);
