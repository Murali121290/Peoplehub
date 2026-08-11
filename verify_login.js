/**
 * Playwright Login Verification Script for PeopleHub
 * Usage:
 *   npx playwright test verify_login.js
 *   or
 *   node verify_login.js [target_url] [email_or_empid] [password]
 */

const { chromium } = require('playwright');

(async () => {
  const targetUrl = process.argv[2] || 'https://peoplehub.s4carlisle.com/login';
  const email = process.argv[3] || '1216';
  const password = process.argv[4] || 'Murali@12';

  console.log(`\n==================================================`);
  console.log(`   PLAYWRIGHT LOGIN VERIFICATION`);
  console.log(`   Target URL : ${targetUrl}`);
  console.log(`   Username   : ${email}`);
  console.log(`==================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to network responses
  page.on('response', (response) => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`[NETWORK] /api/auth/login -> Status: ${response.status()}`);
    }
  });

  // Listen to console logs
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log(`[1] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`[2] Page loaded successfully.`);

    // Fill credentials
    console.log(`[3] Filling login credentials...`);
    await page.fill('input[type="text"], input[name="email"], input[placeholder*="email"], input[placeholder*="ID"]', email);
    await page.fill('input[type="password"]', password);

    console.log(`[4] Submitting form...`);
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();
    await submitButton.click();

    console.log(`[5] Waiting for response...`);
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`[6] Current Page URL after submission: ${currentUrl}`);

    if (currentUrl.includes('/dashboard') || currentUrl.includes('/manager') || currentUrl.includes('/employee')) {
      console.log(`\n SUCCESS: Login succeeded and redirected to dashboard!\n`);
    } else {
      console.log(`\n PAGE STATE: Still on login page or redirected to: ${currentUrl}\n`);
    }

  } catch (err) {
    console.error(`\n ERROR: ${err.message}\n`);
  } finally {
    await browser.close();
  }
})();
