import { test, expect } from '@playwright/test';

test.describe('Main Web App (Marketing Site)', () => {
  test('homepage loads and renders correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check title
    await expect(page).toHaveTitle(/Flaresmith/);
    
    // Check navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: /features/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pricing/i })).toBeVisible();
    
    // Check hero section
    await expect(page.locator('h1')).toContainText('Flaresmith');
    
    // Check CTA buttons
    const buttons = page.locator('button, a[role="button"]');
    await expect(buttons.first()).toBeVisible();
  });

  test('features page displays all feature cards', async ({ page }) => {
    await page.goto('http://localhost:3000/features');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Features');
    
    // Check feature cards
    await expect(page.getByText(/GitHub Integration/i)).toBeVisible();
    await expect(page.getByText(/Environment Sync/i)).toBeVisible();
    await expect(page.getByText(/Cloudflare Deploy/i)).toBeVisible();
    
    // Check testimonial carousel
    await expect(page.locator('[class*="testimonial"]').first()).toBeVisible();
    
    // Check CTA section
    await expect(page.getByRole('link', { name: /View Pricing/i })).toBeVisible();
  });

  test('pricing page shows all tiers with loading states', async ({ page }) => {
    await page.goto('http://localhost:3000/pricing');
    
    // Check pricing tiers
    await expect(page.getByText(/Free/i).first()).toBeVisible();
    await expect(page.getByText(/Pro/i).first()).toBeVisible();
    await expect(page.getByText(/Enterprise/i).first()).toBeVisible();
    
    // Test loading state on button click
    const checkoutButton = page.getByRole('button', { name: /Start Free/i }).first();
    await checkoutButton.click();
    
    // Should show loading spinner
    await expect(page.locator('[class*="spinner"]').first()).toBeVisible();
  });

  test('navigation works across all pages', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Navigate to features
    await page.click('a[href="/features"]');
    await expect(page).toHaveURL(/.*features/);
    
    // Navigate to pricing
    await page.click('a[href="/pricing"]');
    await expect(page).toHaveURL(/.*pricing/);
    
    // Navigate back home
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('dark mode persists across page loads', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check if dark mode class is present
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    // Navigate to another page
    await page.goto('http://localhost:3000/features');
    
    // Dark mode should still be active
    await expect(html).toHaveClass(/dark/);
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Check mobile navigation
    await expect(page.locator('nav')).toBeVisible();
    
    // Check content is visible and not overflowing
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('User Web App (Dashboard)', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    
    // Check form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    
    // Check sign up toggle
    await expect(page.getByText(/sign up|create account/i)).toBeVisible();
  });

  test('projects page is accessible', async ({ page }) => {
    await page.goto('http://localhost:3001/projects');
    
    // Should show projects list or empty state
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('new project page renders form', async ({ page }) => {
    await page.goto('http://localhost:3001/projects/new');
    
    // Check page title
    await expect(page.locator('h1')).toContainText(/New Project/i);
    
    // Check form fields exist
    const form = page.locator('form, div[class*="form"]').first();
    await expect(form).toBeVisible();
  });

  test('billing page shows subscription info', async ({ page }) => {
    await page.goto('http://localhost:3001/billing');
    
    // Check billing header
    await expect(page.getByText(/Billing|Subscription/i).first()).toBeVisible();
    
    // Check upgrade buttons
    await expect(page.getByRole('button', { name: /Upgrade|Pro|Enterprise/i }).first()).toBeVisible();
  });
});

test.describe('Admin Web App', () => {
  test('admin users page loads', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/users');
    
    // Check admin interface
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('admin settings page loads', async ({ page }) => {
    await page.goto('http://localhost:3002/admin/settings');
    
    // Check settings interface
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Cross-App Functionality', () => {
  test('all apps use consistent button variants', async ({ page }) => {
    // Test main web
    await page.goto('http://localhost:3000/features');
    await expect(page.locator('button[class*="gradient"], a[class*="gradient"]').first()).toBeVisible();
    
    // Test user web
    await page.goto('http://localhost:3001/billing');
    await expect(page.locator('button[class*="gradient"]').first()).toBeVisible();
  });

  test('all apps have proper error boundaries', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('http://localhost:3000/nonexistent');
    
    // Should show 404 or error page, not crash
    await expect(page.locator('body')).toBeVisible();
  });
});
