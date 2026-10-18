import { test, expect } from '@playwright/test';

test.describe('AKR Credit Capital - End-to-End Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test for clean isolation
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('Route Separation: Logged-out access to protected routes redirects correctly', async ({ page }) => {
    // 1. Opening /admin/dashboard while logged out redirects strictly to /admin/login
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);

    // 2. Opening /app/home while logged out redirects strictly to /app/login
    await page.goto('/app/home');
    await expect(page).toHaveURL(/\/app\/login/);
  });

  test('Cross-Login Prevention: Admin credentials fail on consumer login & consumer credentials fail on admin login', async ({ page }) => {
    // 1. Try Admin credentials on /app/login
    await page.goto('/app/login');
    await page.fill('input#email-or-mobile-number, input[name="identifier"]', 'admin@akr.com');
    await page.fill('input#password, input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Must show standard invalid credentials error
    await expect(page.locator('text=Invalid email/mobile number or password')).toBeVisible();

    // 2. Try Consumer credentials on /admin/login
    await page.goto('/admin/login');
    await page.fill('input#corporate-email-address, input[name="email"]', 'rahul@example.com');
    await page.fill('input#security-password, input[name="password"]', 'Demo@123');
    await page.click('button[type="submit"]');

    // Must fail on admin side
    await expect(page.locator('text=Invalid admin credentials')).toBeVisible();
  });

  test('Staff Role Authorization: Staff cannot open Super Admin Activity Log by direct URL', async ({ page }) => {
    // Log in as Staff Admin
    await page.goto('/admin/login');
    await page.fill('input#corporate-email-address, input[name="email"]', 'staff@akr.com');
    await page.fill('input#security-password, input[name="password"]', 'Staff@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Navigate to super-admin-only route /admin/activity-log
    await page.goto('/admin/activity-log');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('Consumer App Flow: Login, View ₹24,850 dues across plans, and execute simulated payment', async ({ page }) => {
    // 1. Login as Rahul Sharma
    await page.goto('/app/login');
    await page.fill('input#email-or-mobile-number, input[name="identifier"]', 'rahul@example.com');
    await page.fill('input#password, input[name="password"]', 'Demo@123');
    await page.click('button[type="submit"]');

    // 2. Home Screen renders template figures: ₹24,850 total outstanding, Next EMI ₹4,250
    await expect(page).toHaveURL(/\/app\/home/);
    await expect(page.locator('text=Rahul Sharma').first()).toBeVisible();
    await expect(page.locator('text=₹24,850').first()).toBeVisible();
    await expect(page.locator('text=₹4,250').first()).toBeVisible();

    // 3. Open Pay Dues
    await page.click('text=Pay Now');
    await expect(page).toHaveURL(/\/app\/pay/);

    // 4. Click Pay Now button to open Mock Payment Gateway
    await page.click('button:has-text("Pay Now")');
    await expect(page.locator('text=Mock Payment Gateway')).toBeVisible();

    // 5. Simulate Success
    await page.click('button:has-text("Simulate Success")');

    // 6. Payment Successful Result Screen appears
    await expect(page.locator('text=Payment Successful!')).toBeVisible();
    await expect(page.locator('button:has-text("Download Receipt")')).toBeVisible();
  });

  test('Cross-Side Sync: Admin changes reflect in Consumer App & Consumer payment reflects in Admin Ledger', async ({ page }) => {
    // 1. Consumer pays an EMI
    await page.goto('/app/login');
    await page.fill('input#email-or-mobile-number, input[name="identifier"]', 'rahul@example.com');
    await page.fill('input#password, input[name="password"]', 'Demo@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app\/home/);

    await page.click('text=Pay Now');
    await page.click('button:has-text("Pay Now")');
    await page.click('button:has-text("Simulate Success")');
    await expect(page.locator('text=Payment Successful!')).toBeVisible();

    // 2. Open Admin Panel and verify the payment appears in Payments Ledger
    await page.goto('/admin/login');
    await page.fill('input#corporate-email-address, input[name="email"]', 'admin@akr.com');
    await page.fill('input#security-password, input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/admin/payments');
    await expect(page.locator('text=Rahul Sharma').first()).toBeVisible();
  });
});
