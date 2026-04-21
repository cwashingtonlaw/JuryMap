import { test, expect } from '@playwright/test';

test('full strike-to-seated flow: questioning → decision → seated → PDF link visible', async ({
  page,
}) => {
  // Start fresh
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);

  // Create a case and import 21 jurors
  await page.getByRole('link', { name: /new case/i }).click();
  await page.getByLabel(/case name/i).fill('E2E v. Strike');
  const rows = Array.from({ length: 21 })
    .map((_, i) => `J${i + 1},${100 + i}`)
    .join('\n');
  await page
    .getByPlaceholder(/name,juror_number/i)
    .fill('name,juror_number\n' + rows);
  await page.getByRole('button', { name: /create case/i }).click();

  // On Questioning: advance to Decision
  await expect(page.getByText('Panel 1 — Questioning')).toBeVisible();
  await page
    .getByRole('button', { name: /finish questioning/i })
    .click();
  await expect(page).toHaveURL(/\/decision$/);
  await expect(page.getByText('Panel 1 — Decision')).toBeVisible();

  // Keep the first 14 jurors (seats 1–14)
  for (let i = 1; i <= 14; i++) {
    await page.getByTestId(`seat-${i}`).click();
    await page.getByRole('button', { name: /save decision/i }).click();
  }

  // Peremptory-strike the remaining 7 as State strikes (seats 15–21)
  for (let i = 15; i <= 21; i++) {
    await page.getByTestId(`seat-${i}`).click();
    await page.getByLabel(/peremptory — state/i).click();
    await page.getByPlaceholder(/race-neutral reason/i).fill('demeanor');
    await page.getByRole('button', { name: /save decision/i }).click();
  }

  // Finish decisions → should navigate to Seated Jury
  await page.getByRole('button', { name: /finish decisions/i }).click();
  await expect(page).toHaveURL(/\/seated$/);
  await expect(page.getByText(/Juror 12/i)).toBeVisible();
  await expect(page.getByText(/Alternate 2/i)).toBeVisible();

  // Export PDF Report link is present
  await expect(
    page.getByRole('link', { name: /export pdf report/i })
  ).toBeVisible();
});
