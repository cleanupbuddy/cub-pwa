const { test, expect } = require('@playwright/test');

test('CUB app loads', async ({ page }) => {
  await page.goto('https://app.getcubsuite.com');

  await expect(page).toHaveTitle(/CUB|React|Line/i);
});