const { test, expect } = require('@playwright/test');

const URL = 'http://localhost:3000';
const PASSWORD = 'LIFRA-Analyzer1!';
const PIN = '1234';

async function login(page) {
  await page.goto(URL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="pin"]', PIN);
  await page.click('button:has-text("Access Analyzer")');
}

test('Gate screen loads', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('text=LIFRA Analyzer')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('Wrong password shows error', async ({ page }) => {
  await page.goto(URL);
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button:has-text("Continue")');
  await expect(page.locator('text=Incorrect password')).toBeVisible();
});

test('Correct password advances to PIN', async ({ page }) => {
  await page.goto(URL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Continue")');
  await expect(page.locator('text=Enter your PIN')).toBeVisible();
});

test('Wrong PIN shows error', async ({ page }) => {
  await page.goto(URL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="pin"]', '9999');
  await page.click('button:has-text("Access Analyzer")');
  await expect(page.locator('text=Incorrect PIN')).toBeVisible();
});

test('Full login works and shows Masoud', async ({ page }) => {
  await login(page);
  await expect(page.locator('button:has-text("Step 1")').first()).toBeVisible();
  await expect(page.locator('text=Masoud')).toBeVisible();
});

test('Step 1 all sections render', async ({ page }) => {
  await login(page);
  await expect(page.locator('text=Agent Information')).toBeVisible();
  await expect(page.locator('text=IRA Ownership Information')).toBeVisible();
  await expect(page.locator('text=Insured Information')).toBeVisible();
  await expect(page.locator('text=Policy Illustration Information')).toBeVisible();
});

test('Privacy notice visible', async ({ page }) => {
  await login(page);
  await expect(page.locator('text=Privacy Notice')).toBeVisible();
  await expect(page.locator('text=never transmitted')).toBeVisible();
});

test('Survivorship fields show when Married', async ({ page }) => {
  await login(page);
  await expect(page.locator('text=If Survivorship')).toBeVisible();
});

test('Navigate to Step 2 and verify math', async ({ page }) => {
  await login(page);
  await page.click('button:has-text("Continue to Step 2")');
  await expect(page.locator('text=Retirement Savings Parameters')).toBeVisible();
  await expect(page.locator('div').filter({hasText: /^\$1,259,712$/}).first()).toBeVisible();
  await expect(page.locator('div').filter({hasText: /^\$550,502$/}).first()).toBeVisible();
  await expect(page.locator('div').filter({hasText: /^\$1,260,000$/}).first()).toBeVisible();
  await expect(page.locator('div').filter({hasText: /more to heirs/}).nth(1)).toBeVisible();
});

test('Step 3 email output renders correctly', async ({ page }) => {
  await login(page);
  await page.click('button:has-text("Continue to Step 2")');
  await page.click('button:has-text("Continue to Step 3")');
  await expect(page.locator('text=Submit to NYL APG')).toBeVisible();
  await expect(page.locator('textarea')).toBeVisible();
  const emailText = await page.locator('textarea').inputValue();
  expect(emailText).toContain('LIFRA Illustration Summary');
  expect(emailText).toContain('RETIREMENT SAVINGS INFORMATION');
  expect(emailText).toContain('ILLUSTRATION RESULTS');
  expect(emailText).toContain('STRATEGY COMPARISON');
});
