import { test, expect } from '@playwright/test';

test('landing page loads with key content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/TaskPilot/i);
  await expect(page.getByText('Stop doing IT busywork')).toBeVisible();
  await expect(page.getByText('$19').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Get the Kit/i }).first()).toBeVisible();
});
