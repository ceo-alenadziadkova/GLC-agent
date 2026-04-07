import { test, expect } from '@playwright/test';

test.describe('public routing smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/sign in to the audit workspace and client portal/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('unauthenticated user hitting dashboard ends on login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('root shows marketing home for unauthenticated session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('marketing-home')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /find what slows growth across your digital stack/i }),
    ).toBeVisible();
  });
});
