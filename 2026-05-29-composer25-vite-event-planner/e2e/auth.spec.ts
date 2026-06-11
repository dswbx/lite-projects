import { test, expect } from "@playwright/test";
import { uniqueEmail, signUp, signIn, signOut } from "./helpers";

test("sign up creates an account and signs the user in", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("sign out returns to auth, then sign in with the same credentials works", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await signOut(page);
  await signIn(page, email);
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
});
