import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/10-wildcard-cors.html");
  await page.selectOption("#mode", "reflect");
  await page.check("#credentials");
  await page.click("#request");
  await page.waitForFunction(() =>
    document.querySelector("#result")?.textContent?.includes("ctfpawned{"),
  );
  const result = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  );
  return result.body.flag;
}
