import { test, expect } from "@playwright/test";
import { uniqueEmail, signUp, signOut, createEvent } from "./helpers";

test("a user cannot see another user's events (RLS isolation)", async ({ page }) => {
  // User A creates a private event.
  await signUp(page, uniqueEmail());
  await createEvent(page, { name: "Alice Private Party", location: "Secret" });
  await signOut(page);

  // User B sees an empty list, not Alice's event.
  await signUp(page, uniqueEmail());
  await expect(page.getByText("No upcoming events")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Alice Private Party" }),
  ).toHaveCount(0);
});
