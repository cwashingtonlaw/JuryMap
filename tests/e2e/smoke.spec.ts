import { test, expect } from '@playwright/test';

test('redirects from / to /cases and shows empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByText(/no cases yet/i)).toBeVisible();
});
