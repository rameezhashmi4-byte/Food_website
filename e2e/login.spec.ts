import { test, expect } from "@playwright/test";

/**
 * Unauthenticated-flow coverage for `apps/web`'s login page and protected
 * routes. None of this needs live Google/Microsoft/Supabase credentials -
 * it only checks form UX, presence/state of the OAuth buttons, and
 * redirect behavior.
 */

test.describe("Login page (/login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("email login reaches a 'check your email' confirmation state", async ({ page }) => {
    const emailField = page.getByRole("textbox", { name: /email/i });
    await expect(emailField).toBeVisible();
    await emailField.fill("e2e-test-user@bitejoy.test");

    const submit = page.getByRole("button", { name: /email me a sign-in link/i });
    await expect(submit).toBeVisible();
    await submit.click();

    // Don't try to click a real email link - just verify the submission UX
    // tells the user to go check their inbox.
    await expect(page.getByText(/check .*for a sign-in link/i)).toBeVisible();
  });

  test("Google sign-in is present, and is either usable or clearly marked as not configured", async ({ page }) => {
    const googleButton = page.getByRole("button", { name: /continue with google|google sign-in/i });
    await expect(googleButton).toBeVisible();

    if (await googleButton.isDisabled()) {
      await expect(page.getByText(/not configured|coming soon|unavailable/i)).toBeVisible();
    }
  });

  test("Microsoft sign-in is present, and is either usable or clearly marked as not configured", async ({ page }) => {
    const microsoftButton = page.getByRole("button", { name: /continue with microsoft|microsoft sign-in/i });
    await expect(microsoftButton).toBeVisible();

    if (await microsoftButton.isDisabled()) {
      await expect(page.getByText(/not configured|coming soon|unavailable/i)).toBeVisible();
    }
  });
});

test.describe("Protected routes", () => {
  test("visiting /account while signed out redirects to /login", async ({ page }) => {
    await page.goto("/account");
    await page.waitForURL(/\/login/);
    expect(new URL(page.url()).pathname).toBe("/login");
  });
});
