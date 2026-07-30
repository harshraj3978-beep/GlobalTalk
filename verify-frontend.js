const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: '/home/jules/verification/videos',
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Go to site
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  // Fill Register Form
  await page.click('#tab-register');
  await page.waitForTimeout(500);

  const unique = Date.now();
  await page.fill('#reg-username', 'visual_bob_' + unique);
  await page.fill('#reg-email', 'visual_bob_' + unique + '@globaltalk.com');
  await page.fill('#reg-password', 'password123');
  await page.fill('#reg-name', 'Visual Bob');
  await page.selectOption('#reg-native', 'English');
  await page.selectOption('#reg-target', 'Spanish');
  await page.fill('#reg-location', 'Dallas, USA');
  await page.fill('#reg-hobbies', 'Guitar, Hiking');
  await page.fill('#reg-bio', 'Let us learn!');
  await page.waitForTimeout(1000);

  // Submit Register
  await page.click('#register-form button[type="submit"]');
  await page.waitForTimeout(1000);

  // Log in
  await page.click('#tab-login');
  await page.waitForTimeout(500);
  await page.fill('#login-email', 'visual_bob_' + unique + '@globaltalk.com');
  await page.fill('#login-password', 'password123');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(2000);

  // Go to Voicerooms Screen
  await page.click('button[data-tab="voicerooms"]');
  await page.waitForTimeout(1000);

  // Join/Create Room
  await page.fill('#voiceroom-name-input', 'English & Spanish Cafe Practice');
  await page.click('#voiceroom-join-form button[type="submit"]');
  await page.waitForTimeout(2000);

  // Take screenshot of the Voicerooms active stage showing active speakers & audio wave indicators!
  await page.screenshot({ path: '/home/jules/verification/screenshots/verification.png' });
  await page.waitForTimeout(1000);

  await context.close();
  await browser.close();
  console.log('Verification run complete!');
}

run().catch(console.error);
