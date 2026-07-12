const { test, expect } = require('@playwright/test');

test.describe('GlobalTalk End-To-End Platform Flows', () => {

  test.beforeEach(async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/reset-db');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    console.log('RESET DB RESULT:', data.message);
  });

  test('Should allow user registration, authentication, matches display, profile, and moments posting', async ({ page }) => {
    // Log browser console and network errors
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('response', async response => {
      if (response.status() >= 400) {
        console.log(`FETCH ERROR: ${response.url()} -> ${response.status()}`);
        try {
          const text = await response.text();
          console.log('FETCH ERROR BODY:', text);
        } catch (e) {}
      }
    });

    // 1. Visit Auth Screen
    await page.goto('http://localhost:3000');
    await expect(page.locator('#auth-screen')).toBeVisible();

    // 2. Trigger Registration Tab
    await page.click('#tab-register');
    await expect(page.locator('#register-form')).toBeVisible();

    // Fill registration info
    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `alice_${randomSuffix}`;
    const email = `alice_${randomSuffix}@globaltalk.com`;

    await page.fill('#reg-username', username);
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', 'secretpassword');
    await page.fill('#reg-name', 'Alice In Wonderland');
    await page.selectOption('#reg-native', 'English');
    await page.selectOption('#reg-target', 'Spanish');
    await page.fill('#reg-location', 'Madrid, Spain');
    await page.selectOption('#reg-proficiency', 'Beginner');
    await page.fill('#reg-tags', 'gaming, cooking');
    await page.fill('#reg-hobbies', 'Reading, Coding');
    await page.fill('#reg-bio', 'Let us learn Spanish together!');

    // Submit registration and wait 1s for completion
    await page.click('#register-form button[type="submit"]');
    await page.waitForTimeout(1000);

    // Wait for login form to be visible and prefilled
    await expect(page.locator('#login-form')).toBeVisible();
    await page.click('#login-form button[type="submit"]');

    // 3. Authenticated: Confirm Dashboard View & Map Pins
    await expect(page.locator('#main-nav')).toBeVisible();
    await expect(page.locator('#dashboard-screen')).toBeVisible();

    // Check directory recommendations yuki Tanaka
    await expect(page.locator('#directory-matches')).toContainText('Yuki Tanaka');

    // Check Map Pins render
    const mapPins = page.locator('.map-pin');
    await expect(mapPins.first()).toBeVisible();

    // 4. Test Directory Filters
    await page.selectOption('#filter-age', '18-25');
    await page.selectOption('#filter-region', 'Asia');
    await page.fill('#filter-interests', 'gaming');
    await page.click('#btn-apply-filters');

    // Confirm Yuki Tanaka is visible
    await expect(page.locator('#directory-matches')).toContainText('Yuki Tanaka');

    // 5. Navigate to Moments screen and post status with simulated image attachment
    await page.click('button[data-tab="moments"]');
    await expect(page.locator('#moments-screen')).toBeVisible();

    await page.fill('#moment-content', 'Hola, learning Spanish verbs today! #achieve');
    await page.selectOption('#moment-image-select', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500');
    await page.click('#new-moment-form button[type="submit"]');

    // Verify status rendered on timeline
    await expect(page.locator('#moments-timeline')).toContainText('Hola, learning Spanish verbs today!');

    // 6. Community Moment Corrections flow
    await page.click('button:has-text("Community Correct")');
    await expect(page.locator('#moment-correction-modal')).toBeVisible();
    await page.fill('#moment-correction-input-text', 'Hola, learning Spanish verb conjugations today!');
    await page.click('#submit-moment-correction-confirm');

    // Ensure corrected timeline reflects change
    await expect(page.locator('#moments-timeline')).toContainText('Correction by Alice In Wonderland');

    // 7. Verify Profile progression xp triggers
    await page.click('button[data-tab="profile"]');
    await expect(page.locator('#profile-screen')).toBeVisible();
    await expect(page.locator('#profile-xp-ratio')).toContainText('XP');
  });

  test('Should enforce monetization tier limits and allow bypass with mock premium toggle', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`FETCH ERROR: ${response.url()} -> ${response.status()}`);
      }
    });

    // 1. Authenticate with a seeded user
    await page.goto('http://localhost:3000');
    await page.fill('#login-email', 'yuki@globaltalk.com');
    await page.fill('#login-password', 'password123');
    await page.click('#login-form button[type="submit"]');

    await expect(page.locator('#dashboard-screen')).toBeVisible();

    // 2. Open chat window with Carlos Gomez
    await page.click('#directory-matches .partner-card:has-text("Carlos Gomez") .btn-chat');
    await expect(page.locator('#chat-screen')).toBeVisible();

    // Verify Ad banner is visible to free yuki
    await expect(page.locator('#chat-ad-banner')).toBeVisible();

    // Send a message first
    await page.fill('#chat-msg-input', 'Hola Carlos, can you correct my sentence?');
    await page.click('#chat-input-form button[type="submit"]');

    // Hover over the message bubble to expose action overlay tools
    const bubble = page.locator('.message-bubble').first();
    await bubble.hover();

    // Apply translation trigger (Zero-API transliterations)
    await page.click('button:has-text("Translate")', { force: true });
    await expect(page.locator('.simulated-translation-display').first()).toBeVisible();

    // 3. Verify target multi-language configuration block in profile edit
    await page.click('button[data-tab="profile"]');
    await expect(page.locator('#profile-screen')).toBeVisible();

    await page.selectOption('#edit-target', 'French');
    await page.click('#edit-profile-form button[type="submit"]');

    // Expect VIP block premium modal overlay to show
    await expect(page.locator('#premium-upgrade-modal')).toBeVisible();
    await page.click('#close-premium-modal');

    // 4. Test Floating Sandbox Toggle: instantly swap VIP Premium status
    await page.click('#quick-pro-toggle');
    // Confirm sandbox Pro transition successful
    await expect(page.locator('#premium-brand-tag')).toBeVisible();

    // Re-verify Target Language config change works now!
    await page.selectOption('#edit-target', 'French');
    await page.click('#edit-profile-form button[type="submit"]');
    await expect(page.locator('#toast-container')).toContainText('Profile changes saved successfully!');
  });

  test('Should display Golden, Silver, Bronze Leaderboards, and simulate Voicerooms & Livestreams UI', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`FETCH ERROR: ${response.url()} -> ${response.status()}`);
      }
    });

    // Authenticate Chloe Laurent (VIP Premium preloaded)
    await page.goto('http://localhost:3000');
    await page.fill('#login-email', 'chloe@globaltalk.com');
    await page.fill('#login-password', 'password123');
    await page.click('#login-form button[type="submit"]');

    await expect(page.locator('#dashboard-screen')).toBeVisible();

    // Verify Ads are hidden for premium Chloe
    await expect(page.locator('#dashboard-ad-banner')).toBeHidden();

    // 1. Leaderboard Rank validation
    await page.click('button[data-tab="leaderboard"]');
    await expect(page.locator('#leaderboard-screen')).toBeVisible();
    await expect(page.locator('.rank-badge-item.gold')).toBeVisible();

    // 2. Voicerooms multi-user simulator flow
    await page.click('button[data-tab="voicerooms"]');
    await expect(page.locator('#voicerooms-screen')).toBeVisible();
    await page.click('#voiceroom-join-form button[type="submit"]');
    await expect(page.locator('#voiceroom-active-container')).toBeVisible();

    // Raise hand simulation
    await page.click('#btn-raise-hand-room');

    // Leave room stage
    await page.click('#btn-leave-voiceroom');
    await expect(page.locator('#voiceroom-active-container')).toBeHidden();

    // 3. Livestream broadcast simulation check
    await page.click('button[data-tab="live"]');
    await expect(page.locator('#live-screen')).toBeVisible();
    await expect(page.locator('#live-chat-scroller-box')).toContainText('@');

    // Post to livestream comment stream
    await page.fill('#live-chat-input-text', 'Wow Marie! Marvelous lesson indeed!');
    await page.click('#live-chat-input-form button[type="submit"]');
    await expect(page.locator('#live-chat-scroller-box')).toContainText('Marie');
  });

});
