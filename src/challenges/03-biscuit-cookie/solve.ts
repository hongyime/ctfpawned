import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/03-biscuit-cookie.html");
  await page.evaluate(() => {
    document.cookie = "staff=true";
  });
  await page.click("#refresh");
  return page.locator("#flag").textContent();
}
