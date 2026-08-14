import { expect, test } from "@playwright/test";
import {
  SITE_DESCRIPTION,
  SITE_IMAGE_PATH,
  SITE_URL,
} from "../../src/lib/site";
import { allChallengeMetas } from "./challenge-fixtures";

const readyChallenges = allChallengeMetas.filter(
  (challenge) => challenge.status === "ready",
);

test.describe("public launch metadata", () => {
  test("home publishes canonical, social, and icon metadata", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("ctfpawned");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      SITE_DESCRIPTION,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/`,
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/favicon.svg",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE_URL}${SITE_IMAGE_PATH}`,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("challenge pages publish challenge-specific metadata", async ({
    page,
  }) => {
    const challenge = readyChallenges[0];

    await page.goto(`/c/${challenge.slug}/`);

    await expect(page).toHaveTitle(
      `${challenge.cat}: ${challenge.title} | ctfpawned`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      challenge.tagline,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/c/${challenge.slug}/`,
    );
  });

  test("robots points crawlers at the sitemap and away from raw targets", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    const body = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /targets/");
    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  test("sitemap lists public shell pages and challenge routes only", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");
    expect(body).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/primer/</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/about/</loc>`);
    expect(body).not.toContain("/targets/");

    for (const challenge of readyChallenges) {
      expect(body).toContain(`<loc>${SITE_URL}/c/${challenge.slug}/</loc>`);
      expect(body).toContain(
        `<loc>${SITE_URL}/c/${challenge.slug}/solution/</loc>`,
      );
    }
  });
});
