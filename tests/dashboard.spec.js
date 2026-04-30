const { test, expect } = require('@playwright/test');

test.use({ storageState: 'tests/auth/auth.json' });

test('Dashboard loads with therapist name', async ({ page }) => {
  await page.goto('https://app.getcubsuite.com');

  await page.waitForLoadState('networkidle');

  // Replace with your actual therapist name if needed
  await expect(page.getByText('Jamie')).toBeVisible();
});