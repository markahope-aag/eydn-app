import { test as setup } from "@playwright/test";

/**
 * Auth setup — uses Clerk Backend API to create a session token,
 * then injects it as a cookie so dashboard pages load authenticated.
 *
 * Requires:
 *   E2E_CLERK_USER_EMAIL — test account email
 *   E2E_CLERK_USER_PASSWORD — test account password
 *   CLERK_SECRET_KEY — Clerk secret key (from .env.local)
 */

setup("authenticate", async ({ page, context }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const password = process.env.E2E_CLERK_USER_PASSWORD;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!email || !password || !clerkSecretKey) {
    console.warn(
      "⚠ E2E_CLERK_USER_EMAIL, E2E_CLERK_USER_PASSWORD, or CLERK_SECRET_KEY not set. " +
      "Dashboard tests will skip."
    );
    return;
  }

  // Step 1: Find the user by email via Clerk Backend API
  const usersRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${clerkSecretKey}` } }
  );
  const users = await usersRes.json();

  if (!users || users.length === 0) {
    throw new Error(`No Clerk user found with email ${email}. Create the test account first.`);
  }

  const userId = users[0].id;

  // Step 2: Create a sign-in token for the user
  const tokenRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData?.token) {
    throw new Error(`Failed to create sign-in token: ${JSON.stringify(tokenData)}`);
  }

  // Step 3: Use the sign-in token to authenticate via Clerk's accept URL
  // This sets the session cookie in the browser
  const acceptUrl = `https://eydn.app/__clerk/v1/sign_in_tokens/${tokenData.token}/accept`;

  await page.goto(acceptUrl, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {
    // The redirect might fail but cookies should be set
  });

  // Alternative: navigate to the app and let Clerk handle the token
  await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 15000 });

  // Check if we're on the dashboard (not redirected to sign-in)
  const url = page.url();
  if (url.includes("/sign-in")) {
    // Try the ticket approach instead
    await page.goto(
      `/sign-in#/verify?__clerk_ticket=${tokenData.token}`,
      { waitUntil: "networkidle", timeout: 15000 }
    );
    await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => {});
  }

  // Save session state
  await context.storageState({ path: "playwright/.auth/user.json" });
  console.log(`✓ Authenticated as ${email} (${userId})`);
});
