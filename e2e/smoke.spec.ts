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
      page.getByRole('heading', {
        name: /one place where your business context turns into coordinated decisions/i,
      }),
    ).toBeVisible();
  });

  test('snapshot marketing page renders hero and URL field', async ({ page }) => {
    await page.goto('/snapshot');
    await expect(
      page.getByRole('heading', { name: /how well does your website convert visitors\?/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('textbox', { name: /yourcompany\.com/i })).toBeVisible();
  });

  test('express audit marketing page renders', async ({ page }) => {
    await page.goto('/express-audit');
    await expect(page.getByRole('heading', { name: /^focus package$/i })).toBeVisible({ timeout: 15_000 });
  });

  test('full audit marketing page renders', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: /^strategy workspace$/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('public brief page renders form', async ({ page }) => {
    await page.goto('/brief');
    await expect(page.getByRole('heading', { name: /want help from a specialist\?/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('textbox', { name: /^name \*$/i })).toBeVisible();
  });

  test('faq page renders accordion', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.getByRole('heading', { name: /questions and answers/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /where should i start\?/i })).toBeVisible();
  });

  test('legacy discovery path audit/discover loads wizard shell', async ({ page }) => {
    await page.goto('/audit/discover');
    const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });
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
    if (!fragment.ok()) {
      test.skip(true, `Discovery UI fragment unavailable (status ${fragment.status()})`);
    }
    const fragmentText = await fragment.text();
    let fragmentJson: { questions?: Array<{ id: string }> } = {};
    try {
      fragmentJson = JSON.parse(fragmentText) as { questions?: Array<{ id: string }> };
    } catch {
      test.skip(true, 'Discovery UI fragment returned invalid JSON');
    }
    const hasF9 = (fragmentJson.questions ?? []).some(q => q.id === 'f9');
    test.skip(!hasF9, 'Current discovery fragment does not include f9');

    await page.goto('/discovery');

    const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
    await expect(continueBtn).toBeVisible({ timeout: 20_000 });

    const detailsValue = 'Cross-border tax residency; not Spain-only.';
    const answerCurrentQuestion = async () => {
      const textInput = page.getByRole('textbox').first();
      if (await textInput.isVisible()) {
        await textInput.fill('Playwright smoke answer');
        await expect(textInput).toHaveValue('Playwright smoke answer');
      } else {
        const optionButtons = page
          .getByRole('button')
          .filter({ hasNotText: /^Back$/i })
          .filter({ hasNotText: /continue|see my findings/i });
        await expect(optionButtons.first()).toBeVisible();
        await optionButtons.first().click();
      }

      await expect(continueBtn).toBeEnabled({ timeout: 10_000 });
      await continueBtn.click();
    };

    for (let i = 0; i < 20; i += 1) {
      const onF9 = await page
        .getByText(/anything else we should account for in your audit context\?/i)
        .isVisible();
      if (onF9) {
        break;
      }
      await answerCurrentQuestion();
    }

    await expect(page.getByText(/anything else we should account for in your audit context\?/i)).toBeVisible();
    await page.getByRole('button', { name: /yes, there are additional details/i }).click();
    const specify = page.getByRole('textbox').first();
    await specify.fill(detailsValue);
    await expect(specify).toHaveValue(detailsValue);

    await continueBtn.click();
    const backBtn = page.getByRole('button', { name: /^Back$/i });
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await expect(page.getByRole('button', { name: /yes, there are additional details/i })).toBeVisible();
      await expect(page.getByRole('textbox').first()).toHaveValue(detailsValue);
      return;
    }

    // Some flows go directly to findings after the final answer.
    // In that case, return to questionnaire via "Review answers" and verify persistence there.
    await page.getByRole('button', { name: /review answers/i }).click();
    await expect(page.getByRole('button', { name: /yes, there are additional details/i })).toBeVisible();
    await expect(page.getByRole('textbox').first()).toHaveValue(detailsValue);
  });
});
