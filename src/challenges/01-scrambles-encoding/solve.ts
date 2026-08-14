import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/01-scrambles-encoding.html");
  const session = await page.locator("#session").inputValue();
  const forged = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(session, "base64").toString("utf8")),
      role: "staff",
    }),
  ).toString("base64");
  await page.fill("#session", forged);
  await page.click("#apply");
  return page.locator("#flag").textContent();
}
