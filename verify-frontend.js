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

  // Log in as Carlos Gomez (preloaded streak 5)
  await page.fill('#login-email', 'carlos@globaltalk.com');
  await page.fill('#login-password', 'password123');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(1500);

  // 1. Take a screenshot of the dashboard showing 5-Day Streak, matches, and map
  await page.screenshot({ path: '/home/jules/verification/screenshots/dashboard_streak.png' });
  await page.waitForTimeout(1000);

  // 2. Go to Leaderboard tab (shows Leaderboard rows and badges)
  await page.click('button[data-tab="leaderboard"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/home/jules/verification/screenshots/leaderboard_badges.png' });
  await page.waitForTimeout(1000);

  // 3. Go to My Profile tab
  await page.click('button[data-tab="profile"]');
  await page.waitForTimeout(1500);

  // Click on VIP switch slider to enable PRO Premium
  await page.click('.switch-slider');
  await page.waitForTimeout(1500);

  // Take final screenshot showing PRO VIP Badge and golden avatar borders active!
  await page.screenshot({ path: '/home/jules/verification/screenshots/verification.png' });
  await page.waitForTimeout(1000);

  await context.close();
  await browser.close();
  console.log('Phase 4 Verification run complete!');
}

run().catch(console.error);
