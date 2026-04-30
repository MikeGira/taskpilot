import { test, expect } from '@playwright/test';

async function waitForReactHydration(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('button');
    if (!el) return false;
    return Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 15_000 });
}

test('login page: password tab is default, magic link tab works', async ({ page }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto('/login');
  await waitForReactHydration(page);

  if (jsErrors.length) console.warn('JS errors on /login:', jsErrors);

  await expect(page.getByText('Sign in to TaskPilot')).toBeVisible();
  // Target input by ID to avoid matching the show/hide toggle button
  await expect(page.locator('#pw-password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

  // Switch to magic link tab (exact match avoids matching "Sign in with magic link" button)
  await page.getByRole('button', { name: 'Magic link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page.locator('#pw-password')).not.toBeAttached();
});
