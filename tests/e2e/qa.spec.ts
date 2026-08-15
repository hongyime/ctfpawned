import { expect, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";

const readyChallenges = allChallengeMetas.filter(
  (challenge) => challenge.status === "ready",
);
const shellPaths = [
  "/",
  "/primer/",
  "/writeups/",
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
        viewport: window.innerWidth,
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
      await expect(
        page.getByRole("button", { name: "Reveal next hint" }),
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
        viewport: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));

      expect(layout.scroll).toBeLessThanOrEqual(layout.viewport + 1);
    });
  }

  for (const challenge of readyChallenges.filter(
    (candidate) => candidate.mobileOk,
  )) {
    test(`${challenge.slug} mobile-ready challenge holds at 360px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/c/${challenge.slug}/`);

      const layout = await page.evaluate(() => ({
        viewport: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));

      expect(layout.scroll).toBeLessThanOrEqual(layout.viewport + 1);
      await expect(page.locator(".desktop-preferred")).toHaveCount(0);
    });
  }

  test("desktop-preferred badges render from challenge metadata", async ({
    page,
  }) => {
    const desktopPreferred = readyChallenges.filter(
      (challenge) => !challenge.mobileOk,
    );

    await page.goto("/");

    await expect(page.locator(".desktop-preferred")).toHaveCount(
      desktopPreferred.length,
    );
  });

  test("write-ups index links every ready challenge solution", async ({
    page,
  }) => {
    await page.goto("/writeups/");

    await expect(page.locator("[data-writeup-card]")).toHaveCount(
      readyChallenges.length,
    );

    for (const challenge of readyChallenges) {
      const card = page.locator(
        `[data-writeup-card][data-slug="${challenge.slug}"]`,
      );

      await expect(card).toContainText(challenge.cat);
      await expect(card).toHaveAttribute(
        "href",
        `/c/${challenge.slug}/solution/`,
      );
    }
  });

  test("each solution write-up exposes required sections after reveal", async ({
    page,
  }) => {
    for (const challenge of readyChallenges) {
      await page.goto(`/c/${challenge.slug}/solution/`);
      await page.getByRole("button", { name: "Show me anyway" }).click();

      await expect(page.locator("[data-solution-content]")).toContainText(
        "Walkthrough",
      );
      await expect(page.locator("[data-solution-content]")).toContainText(
        "The fix",
      );
      await expect(page.locator("[data-solution-content]")).toContainText(
        "Recovered",
      );
    }
  });
});
