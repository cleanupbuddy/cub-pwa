const { test } = require('@playwright/test');

test('save logged-in state', async ({ page }) => {
  await page.goto('https://app.getcubsuite.com');

  await page.getByRole('button', { name: /sign in with google/i }).click();

  // Complete Google login manually in the opened browser.
  // Once dashboard is visible, Playwright saves the session.
  await page.waitForURL('https://app.getcubsuite.com/**', { timeout: 120000 });

  await page.context().storageState({ path: 'tests/auth/auth.json' });
});