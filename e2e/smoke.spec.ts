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

  test('unauthenticated user hitting portal route ends on login', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('unauthenticated user hitting audit creation ends on login', async ({ page }) => {
    await page.goto('/audit/new');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('root shows marketing home for unauthenticated session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('marketing-home')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /find what slows growth across your digital stack/i }),
    ).toBeVisible();
  });

  test('discovery step-by-step allows switching option and typing text', async ({ page }) => {
    await page.goto('/discovery');

    const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });

    const questionCard = continueBtn.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first();
    const optionButtons = questionCard
      .getByRole('button')
      .filter({ hasNotText: /^Back$/i })
      .filter({ hasNotText: /continue|see my findings/i });

    const optionCount = await optionButtons.count();
    if (optionCount >= 2) {
      const first = optionButtons.nth(0);
      const second = optionButtons.nth(1);
      const secondText = (await second.innerText()).trim();
      await first.click();
      await second.click();
      await continueBtn.click();
      await expect(page.getByText(secondText)).toBeVisible();
      return;
    }

    const textInput = questionCard.getByRole('textbox').first();
    await textInput.fill('Playwright smoke text');
    await expect(textInput).toHaveValue('Playwright smoke text');
    await continueBtn.click();
  });

  test('discovery step-by-step preserves answer on back/next navigation', async ({ page }) => {
    await page.goto('/discovery');

    const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });

    const questionCard = continueBtn.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first();
    const optionButtons = questionCard
      .getByRole('button')
      .filter({ hasNotText: /^Back$/i })
      .filter({ hasNotText: /continue|see my findings/i });

    if (await optionButtons.count()) {
      const chosen = optionButtons.nth(0);
      const chosenText = (await chosen.innerText()).trim();
      await chosen.click();
      await continueBtn.click();

      await page.getByRole('button', { name: /^Back$/i }).click();
      await expect(page.getByRole('button', { name: chosenText })).toBeVisible();
      await continueBtn.click();
      await expect(
        page.locator('div').filter({ hasText: chosenText }).first(),
      ).toBeVisible();
      return;
    }

    const textInput = questionCard.getByRole('textbox').first();
    const value = 'Persisted smoke text';
    await textInput.fill(value);
    await expect(textInput).toHaveValue(value);
    await continueBtn.click();

    await page.getByRole('button', { name: /^Back$/i }).click();
    await expect(page.getByRole('textbox')).toHaveValue(value);
  });

  test('discovery final context question f9 supports details and keeps them', async ({ page, request }) => {
    const fragment = await request.get('/api/discover/ui-fragment');
    const fragmentJson = await fragment.json() as { questions?: Array<{ id: string }> };
    const hasF9 = (fragmentJson.questions ?? []).some(q => q.id === 'f9');
    test.skip(!hasF9, 'Current discovery fragment does not include f9');

    await page.goto('/discovery');

    const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });

    const detailsValue = 'Cross-border tax residency; not Spain-only.';
    const chooseOrFill = async (choice: RegExp | null, text: string | null = null) => {
      if (choice) {
        const option = page.getByRole('button', { name: choice }).first();
        if (await option.isVisible()) {
          await option.click();
        }
      }
      if (text) {
        const input = page.getByRole('textbox').first();
        if (await input.isVisible()) {
          await input.fill(text);
          await expect(input).toHaveValue(text);
        }
      }
      await continueBtn.click();
    };

    await chooseOrFill(/e-commerce/i);
    await chooseOrFill(null, 'Playwright discovery business description');
    await chooseOrFill(/just me/i);
    await chooseOrFill(/growing fast/i);
    await chooseOrFill(/email/i);
    await chooseOrFill(/shared spreadsheet/i);
    await chooseOrFill(/google search/i);
    await chooseOrFill(/whatsapp/i);
    await chooseOrFill(/something else/i);
    await chooseOrFill(/understand where to focus next/i);

    await expect(page.getByText(/anything else we should account for in your audit context\?/i)).toBeVisible();
    await page.getByRole('button', { name: /yes, there are additional details/i }).click();
    const specify = page.getByRole('textbox').first();
    await specify.fill(detailsValue);
    await expect(specify).toHaveValue(detailsValue);

    await continueBtn.click();
    await page.getByRole('button', { name: /^Back$/i }).click();
    await expect(page.getByRole('button', { name: /yes, there are additional details/i })).toBeVisible();
    await expect(page.getByRole('textbox').first()).toHaveValue(detailsValue);
  });
});
