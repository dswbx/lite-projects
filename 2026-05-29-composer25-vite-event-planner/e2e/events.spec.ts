import { test, expect } from "@playwright/test";
import { uniqueEmail, signUp, createEvent, openEvent } from "./helpers";

test("create an event with guests; it shows in the list with an RSVP summary", async ({
  page,
}) => {
  await signUp(page, uniqueEmail());
  await createEvent(page, {
    name: "Garden Party",
    location: "123 Oak Street",
    guests: ["Ada", "Grace"],
  });

  // List card shows location and the pending RSVP summary.
  await expect(page.getByText("123 Oak Street")).toBeVisible();
  await expect(page.getByText("0 yes · 0 no · 2 pending")).toBeVisible();
});

test("edit an event updates its name and location", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await createEvent(page, { name: "Old Name", location: "Old Place" });

  await openEvent(page, "Old Name");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Event name").fill("New Name");
  await page.getByLabel("Location").fill("New Place");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "New Name" })).toBeVisible();
  await expect(page.getByText("New Place")).toBeVisible();
});

test("add a guest, change an RSVP, and remove a guest", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await createEvent(page, {
    name: "Dinner",
    location: "Bistro",
    guests: ["Ada"],
  });

  await openEvent(page, "Dinner");

  // Add a second guest.
  await page.getByPlaceholder("Add guest name").fill("Grace");
  await page.getByRole("button", { name: "Add guest" }).click();
  await expect(page.getByText("Grace", { exact: true })).toBeVisible();

  // Change Ada's RSVP to yes -> summary updates.
  await page.getByLabel("RSVP for Ada").selectOption("yes");
  await expect(page.getByText("1 yes · 0 no · 1 pending")).toBeVisible();

  // Remove Grace -> only Ada remains.
  const graceRow = page.getByRole("listitem").filter({ hasText: "Grace" });
  await graceRow.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Grace", { exact: true })).toHaveCount(0);
  await expect(page.getByText("1 yes · 0 no · 0 pending")).toBeVisible();
});

test("delete an event removes it from the list", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await createEvent(page, { name: "Doomed Event", location: "Nowhere" });

  await openEvent(page, "Doomed Event");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Doomed Event" })).toHaveCount(0);
});
