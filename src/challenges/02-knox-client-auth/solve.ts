import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/02-knox-client-auth.html");
  await page.fill("#username", "knox");
  await page.fill("#password", "side-door-13");
  await page.click("button[type=submit]");
  return page.locator("#flag").textContent();
}
