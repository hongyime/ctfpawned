import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";

const challenge = allChallengeMetas.find(
  (candidate) => candidate.slug === "01-scrambles-encoding",
)!;
const axePaths = [
  "/",
  "/writeups/",
  `/c/${challenge.slug}/`,
  `/c/${challenge.slug}/solution/`,
];

async function currentFocus(page: Page) {
  const topFocus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    return {
      tag: element.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });

  if (topFocus?.tag !== "IFRAME") return topFocus;

  const frame = page
    .frames()
    .find((candidate) =>
      candidate.url().includes(`/targets/${challenge.slug}.html`),
    );
  return (
    (await frame?.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    })) ?? topFocus
  );
}

for (const path of axePaths) {
  test(`${path} has no serious or critical axe violations`, async ({
    browserName,
    page,
  }) => {
    test.skip(browserName !== "chromium", "axe scan is browser-independent");

    await page.goto(path);
    if (path.endsWith("/solution/")) {
      await page.getByRole("button", { name: "Show me anyway" }).click();
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );

    expect(serious).toEqual([]);
  });
}

test("challenge page is keyboard traversable with visible focus", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "focus CSS is browser-independent");

  await page.goto(`/c/${challenge.slug}/`);

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    const focus = await currentFocus(page);

    expect(focus).not.toBeNull();
    expect(focus?.outlineStyle).not.toBe("none");
    expect(focus?.outlineWidth).not.toBe("0px");
  }
});
