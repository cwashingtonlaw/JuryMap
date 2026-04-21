import { test, expect } from '@playwright/test';

test('Batson Analysis screen: strike log, comparators, pattern flag, motion export', async ({
  page,
}) => {
  // Set up a case with 3 state peremptories against black jurors (prima facie)
  await page.goto('/');
  await page.getByRole('link', { name: /new case/i }).click();
  await page.getByLabel(/case name/i).fill('E2E v. Batson');
  const rows = Array.from({ length: 21 })
    .map((_, i) => `J${i + 1},${100 + i}`)
    .join('\n');
  await page
    .getByPlaceholder(/name,juror_number/i)
    .fill('name,juror_number\n' + rows);
  await page.getByRole('button', { name: /create case/i }).click();

  // On Questioning: set J1, J2, J3 to race=black so the strike pattern triggers
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId(`seat-${i}`).click();
    // The Race dropdown is the first <select> in the drawer (Race, Gender, Marital)
    const raceSelect = page.locator('select').first();
    await raceSelect.waitFor();
    await raceSelect.selectOption('black');
    await page.keyboard.press('Escape');
  }

  // Advance to Decision
  await page.getByRole('button', { name: /finish questioning/i }).click();
  await expect(page).toHaveURL(/\/decision$/);

  // Strike J1, J2, J3 as peremptory-state
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId(`seat-${i}`).click();
    await page.getByLabel(/peremptory — state/i).click();
    await page
      .getByPlaceholder(/race-neutral reason/i)
      .fill(`reason ${i}`);
    await page.getByRole('button', { name: /save decision/i }).click();
  }

  // Open Batson Analysis from Decision link
  await page.getByRole('link', { name: /batson analysis/i }).click();
  await expect(page).toHaveURL(/\/batson$/);

  // Verify the pattern flag appears
  await expect(page.getByText(/prima facie/i)).toBeVisible();

  // Verify the strike log shows J1, J2, J3
  await expect(page.getByText('J1')).toBeVisible();
  await expect(page.getByText('J2')).toBeVisible();
  await expect(page.getByText('J3')).toBeVisible();

  // Click J1 in the log → comparator heading updates
  await page.getByText('J1').first().click();
  await expect(page.getByText(/comparators for j1/i)).toBeVisible();

  // Export Motion Draft button is present and clickable
  await expect(
    page.getByRole('button', { name: /export motion draft/i })
  ).toBeVisible();
});
