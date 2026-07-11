const { test, expect } = require('@playwright/test');

test.describe('GlobalTalk End-To-End Platform Flows', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('/');
  });

  test('Should allow user registration, authentication, matches display, profile, and moments posting', async ({ page }) => {
    const uniqueSuffix = Date.now() + Math.floor(Math.random() * 10000);
    const bobUsername = `bob_${uniqueSuffix}`;
    const bobEmail = `bob_${uniqueSuffix}@globaltalk.com`;

    const aliceUsername = `alice_${uniqueSuffix}`;
    const aliceEmail = `alice_${uniqueSuffix}@globaltalk.com`;

    // 1. Verify Welcome Auth Screen is active
    await expect(page.locator('#auth-screen')).toBeVisible();

    // 2. Click register tab
    await page.click('#tab-register');

    // Fill register details for User A (Spanish learner)
    await page.fill('#reg-username', bobUsername);
    await page.fill('#reg-email', bobEmail);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-name', 'Bob Builder');
    await page.selectOption('#reg-native', 'English');
    await page.selectOption('#reg-target', 'Spanish');
    await page.fill('#reg-location', 'Dallas, USA');
    await page.selectOption('#reg-proficiency', 'Beginner');
    await page.fill('#reg-hobbies', 'Soccer, Coding, Cooking');
    await page.fill('#reg-bio', 'Hi, I want to learn perfect Spanish from Dallas!');

    // Submit registration and wait for API response
    const registerBobPromise = page.waitForResponse(resp => resp.url().includes('/api/register') && resp.status() === 201);
    await page.click('#register-form button[type="submit"]');
    await registerBobPromise;

    // Explicitly click "Sign In" tab to ensure form visibility
    await page.click('#tab-login');

    // Wait for registration toast success, then fill login
    await page.fill('#login-email', bobEmail);
    await page.fill('#login-password', 'password123');

    const loginBobPromise = page.waitForResponse(resp => resp.url().includes('/api/login') && resp.status() === 200);
    await page.click('#login-form button[type="submit"]');
    await loginBobPromise;

    // 3. Confirm Dashboard elements
    await expect(page.locator('#main-nav')).toBeVisible();
    await expect(page.locator('#nav-xp-value')).toHaveText('10 XP'); // Level 1 (Starts with 10 XP as registered)
    await expect(page.locator('#nav-lvl-value')).toHaveText('Lv.1');

    // 4. Register User B (Spanish native speaker) so we can match and check calculations
    // Create new clean page instance to register Partner A
    const browser = page.context().browser();
    const pageB = await browser.newPage();
    pageB.on('console', msg => console.log('PAGE B LOG:', msg.text()));
    await pageB.goto('/');
    await pageB.click('#tab-register');
    await pageB.fill('#reg-username', aliceUsername);
    await pageB.fill('#reg-email', aliceEmail);
    await pageB.fill('#reg-password', 'password123');
    await pageB.fill('#reg-name', 'Alice In Wonderland');
    await pageB.selectOption('#reg-native', 'Spanish');
    await pageB.selectOption('#reg-target', 'English');
    await pageB.fill('#reg-location', 'Madrid, Spain');
    await pageB.fill('#reg-hobbies', 'Soccer, Art, Movies'); // soccer matches bob!
    await pageB.fill('#reg-bio', 'Let us talk and exchange language skills!');

    const registerAlicePromise = pageB.waitForResponse(resp => resp.url().includes('/api/register') && resp.status() === 201);
    await pageB.click('#register-form button[type="submit"]');
    await registerAlicePromise;
    await pageB.close();

    // Refresh User A dashboard page to show User B
    await page.click('button[data-tab="dashboard"]');

    // Check match scoring and display cards
    await expect(page.locator('#directory-matches')).toContainText('Alice In Wonderland');
    // Calculations: +40% because English-Spanish match + 20% because hobbies Soccer overlap = 60%
    await expect(page.locator('#directory-matches')).toContainText('60% Match');

    // 5. Navigate to Moments screen and post a Moment
    await page.click('button[data-tab="moments"]');
    await page.fill('#moment-content', 'Today I learned that "Hola" means Hello!');
    await page.fill('#moment-image', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d');

    const momentPostPromise = page.waitForResponse(resp => resp.url().includes('/api/moments') && resp.status() === 201);
    await page.click('#new-moment-form button[type="submit"]');
    await momentPostPromise;

    // Verify moment added to Timeline
    await expect(page.locator('#moments-timeline')).toContainText('Today I learned that "Hola" means Hello!');
    // Verify user gained +10 XP for moment
    await expect(page.locator('#nav-xp-value')).toHaveText('20 XP');

    // 6. Navigate to profile screen and check visual leveling progress bar
    await page.click('button[data-tab="profile"]');
    await expect(page.locator('#profile-name-text')).toHaveText('Bob Builder');
    await expect(page.locator('#profile-level-badge')).toHaveText('Level 1');
    await expect(page.locator('#profile-xp-ratio')).toContainText('20 / 100 XP');

    // Save profile change
    await page.fill('#edit-location', 'Austin, USA');
    await page.click('#edit-profile-form button[type="submit"]');

    // Check directory tab
    await page.click('button[data-tab="directory"]');
    await expect(page.locator('#all-directory-users')).toContainText('Alice In Wonderland');
  });

  test('Should enforce monetization tier limits and allow bypass with mock premium toggle', async ({ page }) => {
    const uniqueSuffix = Date.now() + Math.floor(Math.random() * 10000) + 10;
    const testUsername = `limit_user_${uniqueSuffix}`;
    const testEmail = `limit_user_${uniqueSuffix}@globaltalk.com`;

    const chatUsername = `chat_user_${uniqueSuffix}`;
    const chatEmail = `chat_user_${uniqueSuffix}@globaltalk.com`;

    // 1. Register User & Log In
    await page.click('#tab-register');
    await page.fill('#reg-username', testUsername);
    await page.fill('#reg-email', testEmail);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-name', 'Limiter');
    await page.selectOption('#reg-native', 'Spanish');
    await page.selectOption('#reg-target', 'English');

    const registerLimitPromise = page.waitForResponse(resp => resp.url().includes('/api/register') && resp.status() === 201);
    await page.click('#register-form button[type="submit"]');
    await registerLimitPromise;

    // Explicitly click "Sign In" tab to ensure form visibility
    await page.click('#tab-login');

    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', 'password123');

    const loginLimitPromise = page.waitForResponse(resp => resp.url().includes('/api/login') && resp.status() === 200);
    await page.click('#login-form button[type="submit"]');
    await loginLimitPromise;

    // 2. Register other partner to trigger chat interface
    const browser = page.context().browser();
    const pageC = await browser.newPage();
    pageC.on('console', msg => console.log('PAGE C LOG:', msg.text()));
    await pageC.goto('/');
    await pageC.click('#tab-register');
    await pageC.fill('#reg-username', chatUsername);
    await pageC.fill('#reg-email', chatEmail);
    await pageC.fill('#reg-password', 'password123');
    await pageC.fill('#reg-name', 'Chat Partner');
    await pageC.selectOption('#reg-native', 'English');
    await pageC.selectOption('#reg-target', 'Spanish');

    const registerChatPromise = pageC.waitForResponse(resp => resp.url().includes('/api/register') && resp.status() === 201);
    await pageC.click('#register-form button[type="submit"]');
    await registerChatPromise;
    await pageC.close();

    // 3. Open Chat window with partner
    await page.click('button[data-tab="dashboard"]');
    await page.waitForSelector('.partner-card');
    await page.click('.partner-card button:has-text("Message")');

    // Ensure chat area is shown
    await expect(page.locator('#chat-screen')).toBeVisible();

    // Test Call limit: First call should succeed, second call should block
    await page.click('#start-voice-call-btn');
    await expect(page.locator('#webrtc-call-modal')).toBeVisible();
    await page.click('#btn-hangup-call'); // Hang up

    // Trigger second call (Free tier limit reached!)
    await page.click('#start-voice-call-btn');

    // Pro Premium Modal should overlay immediately
    await expect(page.locator('#premium-upgrade-modal')).toBeVisible();

    // Toggle Premium status directly inside the modal
    await page.click('#mock-premium-toggle-btn');
    await expect(page.locator('#premium-upgrade-modal')).toBeHidden();

    // Verify Premium Badge tag is now visible in the navbar
    await expect(page.locator('#premium-brand-tag')).toBeVisible();

    // Initiate voice call again - should succeed instantly since user has bypassed free limitations!
    await page.click('#start-voice-call-btn');
    await expect(page.locator('#webrtc-call-modal')).toBeVisible();
  });
});
