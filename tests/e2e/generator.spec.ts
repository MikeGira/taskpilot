import { test, expect } from '@playwright/test';

async function waitForReactHydration(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('button');
    if (!el) return false;
    return Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 15_000 });
}

test('generator wizard produces a script end-to-end', async ({ page }) => {
  test.setTimeout(120_000);

  const jsErrors: string[] = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto('/generate');
  await waitForReactHydration(page);

  if (jsErrors.length) console.warn('JS errors on /generate:', jsErrors);

  await expect(page.getByText('What OS are you targeting?')).toBeVisible();

  // Step 1: Click Windows card (clicks the label div; event bubbles to the button)
  await page.getByText('Windows', { exact: true }).click();

  // Step 2: Select On-Premises, then Continue
  await expect(page.getByText("What's your environment?")).toBeVisible();
  await page.getByText('On-Premises', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // Step 3: Pick PowerShell (card click advances to the task step)
  await expect(page.getByText('What tool or language?')).toBeVisible();
  await page.getByText('PowerShell', { exact: true }).click();

  // Step 4: Fill in task description, then Generate
  await expect(page.getByText('What do you want to automate?')).toBeVisible();
  await page.locator('textarea').fill(
    'List all running Windows services and their current status, then save the output to a log file with a timestamp in the filename'
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();

  // Wait for result — AI call can take up to 60s
  await expect(page.getByRole('button', { name: /Download/i })).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('pre code')).not.toBeEmpty();
});
