import { expect, Page } from '@playwright/test';

export type HouseholdFormData = {
  householdName: string;
  primaryGuardian: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  children: Array<{
    firstName: string;
    lastName: string;
    birthdate: string;
  }>;
};

export async function fillHouseholdRegistrationForm(
  page: Page,
  data: HouseholdFormData
) {
  await expect(page.locator('input[name="guardians.0.first_name"]')).toBeVisible({
    timeout: 15000,
  });

  const householdNameInput = page.locator('input[name="household.name"]');
  if (await householdNameInput.count()) {
    await householdNameInput.fill(data.householdName);
  }

  await page.locator('input[name="guardians.0.first_name"]').fill(
    data.primaryGuardian.firstName
  );
  await page.locator('input[name="guardians.0.last_name"]').fill(
    data.primaryGuardian.lastName
  );

  const guardianPhone = page.locator('input[name="guardians.0.mobile_phone"]');
  if (await guardianPhone.count()) {
    await guardianPhone.fill(data.primaryGuardian.phone);
  } else {
    await page.locator('input[type="tel"]').first().fill(data.primaryGuardian.phone);
  }

  await page.locator('input[name="household.address_line1"]').fill(data.address.street);
  await page.locator('input[name="household.city"]').fill(data.address.city);
  await page.locator('input[name="household.state"]').fill(data.address.state);
  await page.locator('input[name="household.zip"]').fill(data.address.zip);

  await page.locator('input[name="emergencyContact.first_name"]').fill('Emergency');
  await page.locator('input[name="emergencyContact.last_name"]').fill('Contact');
  await page.locator('input[name="emergencyContact.relationship"]').fill('Aunt');

  const emergencyPhone = page.locator('input[name="emergencyContact.mobile_phone"]');
  if (await emergencyPhone.count()) {
    await emergencyPhone.fill('555-999-0000');
  } else {
    await page.locator('input[type="tel"]').nth(1).fill('555-999-0000');
  }

  for (let i = 0; i < data.children.length; i++) {
    const child = data.children[i];

    if (i > 0) {
      await page.getByRole('button', { name: /add child/i }).click();
    }

    const firstName = page.locator(`input[name="children.${i}.first_name"]`);
    if (!(await firstName.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: new RegExp(`Child ${i + 1}`) }).click();
    }

    await expect(firstName).toBeVisible({ timeout: 10000 });
    await firstName.fill(child.firstName);
    await page.locator(`input[name="children.${i}.last_name"]`).fill(child.lastName);
    await page.locator(`input[name="children.${i}.dob"]`).fill(child.birthdate);

    const childBlock = page.locator(`[data-state="open"]`).filter({
      has: page.locator(`input[name="children.${i}.first_name"]`),
    });
    await childBlock.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Kindergarten' }).click();
  }

  await page.getByText('Liability Release', { exact: true }).click();
  await page.getByText('Photo Release', { exact: true }).click();
}
