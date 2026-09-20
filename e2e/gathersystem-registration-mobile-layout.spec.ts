import { test, expect, type Page } from '@playwright/test';
import { generateUniqueEmail, TEST_PASSWORD } from './utils/data';
import {
  cleanupReturningSiblingFixture,
  createReturningSiblingFixture,
  deleteTestUser,
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
 * #390 — the wizard has to fit on a phone.
 *
 * The acceptance criterion is a measurement, not a judgement: no horizontal
 * page overflow at 320, 375, 390 or 402px, on every screen. So this walks the
 * whole flow at each width and measures.
 *
 * It collects every violation and reports them together rather than failing on
 * the first. One run then tells you all of what is wrong, which is the
 * difference between one fix-and-rerun cycle and a dozen.
 */

/**
 * The frames the ticket names, as width AND height.
 *
 * Height is not decoration here. A single tall viewport hides the case that
 * matters: at 568px the pinned action bar and the sticky step strip together
 * take a far larger share of the screen, so a control that comfortably clears
 * the fold at 844px may not clear it at all. 390 carries the acceptance
 * criterion's fourth width; it has no frame of its own in the spec, so it is
 * paired with a common phone height.
 */
const FRAMES = [
  { label: '320x568', width: 320, height: 568 },
  { label: '375x812', width: 375, height: 812 },
  { label: '390x844', width: 390, height: 844 },
  { label: '402x874', width: 402, height: 874 },
  { label: 'desktop 1280x900', width: 1280, height: 900 },
];

type Overflow = {
  screen: string;
  width: number;
  scrollWidth: number;
  clientWidth: number;
  offenders: string[];
};

/**
 * `scrollWidth > clientWidth` on the document says the page overflows; it does
 * not say what is sticking out. So when it does, walk the DOM for elements
 * whose right edge lands past the viewport and describe the widest few — that
 * is the part a person can act on.
 */
async function measure(page: Page, screen: string, width: number) {
  return page.evaluate(
    ({ screen, width }) => {
      // The dev server floats its own chrome over the page — the Next.js dev
      // tools button and the TanStack Query devtools launcher — and both sit
      // outside the viewport at phone widths. Neither ships to anyone, so
      // measuring them would report overflow that no parent can ever see, and
      // "fixing" it would mean changing product layout to suit a dev overlay.
      const DEV_ONLY = [
        'nextjs-portal',
        '[data-nextjs-dev-tools-button]',
        '[data-nextjs-toast]',
        '.tsqd-open-btn-container',
        '.tsqd-parent-container',
        '[data-dev-overlay]',
      ].join(',');
      const HIDE_ID = 'e2e-hide-dev-overlays';
      if (!document.getElementById(HIDE_ID)) {
        const style = document.createElement('style');
        style.id = HIDE_ID;
        style.textContent = `${DEV_ONLY}{display:none !important}`;
        document.head.appendChild(style);
      }

      const doc = document.documentElement;
      // Read after the style lands, so the measurement reflects the product.
      void doc.offsetWidth;
      const scrollWidth = doc.scrollWidth;
      const clientWidth = doc.clientWidth;
      if (scrollWidth <= clientWidth) return null;

      const offenders = Array.from(document.querySelectorAll<HTMLElement>('*'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { el, right: r.right, w: r.width };
        })
        .filter((x) => x.right > clientWidth + 1 && x.w > 0)
        // The deepest offender is the useful one: every ancestor of an
        // overflowing element also overflows, and naming the <body> helps
        // nobody.
        .filter((x) => !Array.from(x.el.children).some((c) => {
          const cr = c.getBoundingClientRect();
          return cr.right > clientWidth + 1;
        }))
        .sort((a, b) => b.right - a.right)
        .slice(0, 4)
        .map((x) => {
          // `className` is an SVGAnimatedString on SVG nodes, so read the
          // attribute. And name an identifiable ancestor: an <ellipse> on its
          // own says nothing about which component put it there.
          const describe = (el: Element) => {
            const cls = (el.getAttribute('class') || '').trim().slice(0, 60);
            const tid = el.getAttribute('data-testid');
            const id = el.getAttribute('id');
            return `<${el.tagName.toLowerCase()}` +
              (id ? ` id="${id}"` : '') +
              (tid ? ` data-testid="${tid}"` : '') +
              (cls ? ` class="${cls}"` : '') + '>';
          };
          const chain: string[] = [];
          let node: Element | null = x.el;
          for (let i = 0; node && i < 5; i++) {
            chain.push(describe(node));
            node = node.parentElement;
          }
          const text = (x.el.textContent || '').trim().slice(0, 30);
          return `${describe(x.el)} right=${Math.round(x.right)} ` +
            `w=${Math.round(x.w)} "${text}"\n      in ${chain.slice(1).join(' < ')}`;
        });

      return { screen, width, scrollWidth, clientWidth, offenders };
    },
    { screen, width },
  );
}

function describeLayoutFrame(frame: (typeof FRAMES)[number]) {
  const { label, width, height } = frame;
  // The action bar is pinned on phones and returns to the flow from md up, so
  // the reachability assertion only applies below that breakpoint. On desktop
  // the primary action sitting below a long step is the intended layout.
  const isPhone = width < 768;

  gathersystemDescribe(
    `GatherSystem registration layout at ${label} @mutating`,
    () => {
      test.use({
        viewport: { width, height },
        isMobile: isPhone,
        hasTouch: isPhone,
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

      test(`never overflows horizontally at ${label}`, async ({ page }) => {
        test.skip(!isLocalSupabaseConfigured(), 'Requires local Supabase');
        test.slow();
        assertDisposableLocalSupabase();

        const email = generateUniqueEmail('gs-layout');
        const fixture = await createReturningSiblingFixture(email, TEST_PASSWORD);
        createdUserId = fixture.user.id;
        createdHouseholdId = fixture.householdId;

        await page.context().clearCookies();
        await loginWithPassword(page, email, TEST_PASSWORD);
        await waitForPostLoginRoute(page);

        const found: Overflow[] = [];
        const check = async (screen: string) => {
          const hit = await measure(page, screen, width);
          if (hit) found.push(hit);
        };

        /**
         * The reason the action bar is pinned: steps 4 and 5 are long enough
         * that the primary action used to sit far below the fold, which on a
         * phone reads as a dead end. So assert it from the *top* of the step —
         * scrolled to the bottom it would be reachable either way, and the
         * test would prove nothing.
         */
        const expectPrimaryActionOnScreen = async (step: string) => {
          if (!isPhone) return;
          await page.evaluate(() => window.scrollTo(0, 0));
          const cta = page
            .getByRole('button', { name: /save & continue|submit registration/i })
            .first();
          const box = await cta.boundingBox();
          expect(box, `${step} @ ${label}: no primary action`).not.toBeNull();
          expect(
            box!.y,
            `${step} @ ${label}: primary action above the viewport`,
          ).toBeGreaterThan(0);
          expect(
            box!.y + box!.height,
            `${step} @ ${label}: primary action below the fold at the top of the step`,
          ).toBeLessThanOrEqual(height + 1);
        };

        // ---- Entry -------------------------------------------------------
        await page.goto('/register');
        await expect(page.getByTestId('registration-entry')).toBeVisible({
          timeout: 30000,
        });
        await check('Entry');

        // A returning household, so steps 1-3 arrive populated — which is the
        // case that overflows, not the empty one.
        await startWizardRegistration(page, { expectPrefillKind: 'prior_cycle' });

        // ---- Steps 1 to 5 ------------------------------------------------
        await check('Step 1 — Household');
        await continueToNextStep(page);

        await check('Step 2 — Guardians');
        await continueToNextStep(page);

        // Both children, since the second is reached by the nav row that
        // shares a line with the title.
        await check('Step 3 — Child 1');
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page.getByText('Child 2 of 2')).toBeVisible();
        await check('Step 3 — Child 2');
        await continueToNextStep(page);

        await check('Step 4 — Ministries');
        await expectPrimaryActionOnScreen('Step 4');
        await continueToNextStep(page);

        await check('Step 5 — Consents');
        await expectPrimaryActionOnScreen('Step 5');

        // ---- Done --------------------------------------------------------
        const liability = page.getByRole('checkbox', { name: /liability release/i });
        const photo = page.getByRole('checkbox', { name: /photo release/i });
        if (!(await liability.isChecked())) await liability.check();
        if (!(await photo.isChecked())) await photo.check();

        await page.getByRole('button', { name: /submit registration/i }).click();
        await expect(page.getByRole('heading', { name: /registered!/i })).toBeVisible({
          timeout: 30000,
        });
        await check('Done');

        const report = found
          .map(
            (f) =>
              `\n${f.screen} @ ${f.width}px — scrollWidth ${f.scrollWidth} > ` +
              `clientWidth ${f.clientWidth} (over by ${f.scrollWidth - f.clientWidth}px)\n` +
              f.offenders.map((o) => `    ${o}`).join('\n'),
          )
          .join('\n');

        expect(found.map((f) => f.screen), `Horizontal overflow:\n${report}\n`).toEqual([]);
      });
    },
  );
}

for (const frame of FRAMES) describeLayoutFrame(frame);
