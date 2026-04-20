import { test, expect } from '@playwright/test';

test('creates a case, imports venire, and takes notes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);
  await page.getByRole('link', { name: /new case/i }).click();

  await page.getByLabel(/case name/i).fill('E2E v. Demo');

  await page.getByPlaceholder(/name,juror_number/i).fill(
    `name,juror_number\nAlice Jones,101\nBob Smith,102\nCarla Doe,103`
  );

  await page.getByRole('button', { name: /create case/i }).click();

  // Now on Questioning screen
  await expect(page.getByText('E2E v. Demo')).toBeVisible();
  await expect(page.getByText('Alice Jones')).toBeVisible();
  await expect(page.getByText('Bob Smith')).toBeVisible();

  // Open Alice, add a note, close drawer
  await page.getByText('Alice Jones').click();
  await page.getByPlaceholder(/demeanor/i).fill('Polite, engaged');
  await page.keyboard.press('Escape');

  // Reopen and verify the note persisted
  await page.getByText('Alice Jones').click();
  await expect(page.getByPlaceholder(/demeanor/i)).toHaveValue(
    'Polite, engaged'
  );
});
