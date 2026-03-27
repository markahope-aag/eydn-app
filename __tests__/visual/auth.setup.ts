import { test as setup } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

/**
 * Global auth setup — signs in once and saves the session to a file.
 * All subsequent tests reuse this session via storageState.
 *
 * Requires these env vars:
 *   E2E_CLERK_USER_EMAIL — test account email
 *   E2E_CLERK_USER_PASSWORD — test account password
 */

setup.beforeAll(async () => {
  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      "⚠ E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD not set. " +
      "Dashboard tests will run unauthenticated and likely redirect to sign-in."
    );
    return;
  }

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: email,
      password,
    },
  });

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 15000 });

  // Save signed-in state
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
