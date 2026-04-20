import { test, expect } from '@playwright/test';

test('app shell renders with Cases route', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByRole('heading', { name: /^cases$/i })).toBeVisible();
});
