import { expect, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";

const readyChallenges = allChallengeMetas.filter(
  (challenge) => challenge.status === "ready",
);
const shellPaths = [
  "/",
  "/about/",
  ...readyChallenges.flatMap((challenge) => [
    `/c/${challenge.slug}/`,
    `/c/${challenge.slug}/solution/`,
  ]),
];

test.describe("launch QA", () => {
  for (const path of shellPaths) {
    test(`${path} renders without console errors or horizontal overflow`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();

      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));

      expect(layout.scroll).toBeLessThanOrEqual(layout.viewport + 1);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const challenge of readyChallenges) {
    test(`${challenge.slug} challenge page has playable controls`, async ({
      page,
    }) => {
      await page.goto(`/c/${challenge.slug}/`);

      await expect(page.frameLocator("iframe").locator("body")).toContainText(
        challenge.cat,
      );
      await expect(page.locator("[data-flag-check]")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Reset target" }),
      ).toBeVisible();
      await expect(page.locator(".content-panel").first()).toContainText(
        "Win condition:",
      );
    });
  }

  for (const challenge of readyChallenges) {
    test(`${challenge.slug} target fits without horizontal overflow`, async ({
      page,
    }) => {
      await page.goto(`/targets/${challenge.slug}.html`);

      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));

      expect(layout.scroll).toBeLessThanOrEqual(layout.viewport + 1);
    });
  }
});
