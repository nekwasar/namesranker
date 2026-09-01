import { test, expect } from "@playwright/test";

test("contact page renders with info channels and the form", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  await expect(page.getByTestId("contact-form")).toBeVisible();
  await expect(page.getByRole("link", { name: /namesranker.com/ }).first()).toBeVisible();
});

test("invalid email shows an inline error", async ({ page }) => {
  await page.goto("/contact");
  await page.getByTestId("contact-name").fill("Ada Lovelace");
  await page.getByTestId("contact-email").fill("not-an-email");
  await page
    .getByTestId("contact-message")
    .fill("This is a message long enough to pass validation.");
  await page.getByTestId("contact-submit").click();
  await expect(page.getByTestId("contact-error")).toBeVisible();
});

test("a valid message submits successfully", async ({ page }) => {
  await page.goto("/contact");
  await page.getByTestId("contact-name").fill("Ada Lovelace");
  await page.getByTestId("contact-email").fill("ada@example.com");
  await page.getByTestId("contact-subject").selectOption("Support");
  await page
    .getByTestId("contact-message")
    .fill("I need help getting my page to rank for my name.");
  await page.getByTestId("contact-submit").click();
  await expect(page.getByTestId("contact-success")).toBeVisible();
  await expect(page.getByTestId("contact-success")).toContainText("Ada");
  // Reset lets the visitor send another message.
  await page.getByTestId("contact-reset").click();
  await expect(page.getByTestId("contact-form")).toBeVisible();
});

test("footer links to contact and changelog", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Resources" })
    .getByRole("link", { name: "Contact" })
    .click();
  await page.waitForURL("**/contact");
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Resources" })
    .getByRole("link", { name: "Changelog" })
    .click();
  await page.waitForURL("**/changelog");
  await expect(page.getByRole("heading", { level: 1, name: "Changelog" })).toBeVisible();
});
