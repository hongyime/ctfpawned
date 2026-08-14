import { expect, test } from "@playwright/test";
import { hashFlag } from "../../src/lib/flag";
import { allChallengeMetas } from "./challenge-fixtures";

const readyChallenges = allChallengeMetas.filter(
  (challenge) => challenge.status === "ready",
);

for (const challenge of readyChallenges) {
  test(`${challenge.slug} solve harness recovers the expected flag`, async ({
    page,
  }) => {
    const solver = await import(
      `../../src/challenges/${challenge.slug}/solve.ts`
    );
    const flag = await solver.solve(page);

    expect(flag).toMatch(/^ctfpawned\{[a-z0-9_]+\}$/);
    expect(await hashFlag(challenge.slug, flag)).toBe(challenge.flagHash);

    await page.goto(`/c/${challenge.slug}/`);
    await page.fill('input[name="flag"]', flag);
    await page.getByRole("button", { name: "Check flag" }).click();
    await expect(page.getByText("Correct flag")).toBeVisible();
  });
}
