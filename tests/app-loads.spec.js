const { test, expect } = require('@playwright/test');

test('CUB login screen renders correctly', async ({ page }) => {
  await page.goto('https://app.getcubsuite.com');

  await page.waitForLoadState('networkidle');

  await expect(page.getByText('CUB Line')).toBeVisible();
  await expect(page.getByText('PRIVATE CLINIC LINE')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
});