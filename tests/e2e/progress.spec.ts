import { expect, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";

const progressKey = "ctfpawned:progress";
const challenge = allChallengeMetas.find(
  (candidate) => candidate.slug === "01-scrambles-encoding",
)!;

test("challenge hints are loaded sequentially outside the initial page source", async ({
  page,
  request,
}) => {
  const response = await request.get(`/c/${challenge.slug}/`);
  const body = await response.text();

  expect(body).not.toContain("The session value is not random.");
  expect(body).not.toContain("Do not put trusted authorization claims");
  expect(body).not.toContain("Recovered portal note, week one");

  await page.goto(`/c/${challenge.slug}/`);
  await page.getByRole("button", { name: "Reveal next hint" }).click();
  await expect(
    page.getByText("The session value is not random."),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("The session value is not random."),
  ).toBeVisible();
  await expect(page.locator("[data-hint-count-label]")).toHaveText(
    "1/3 revealed",
  );
});

test("progress survives reload and syncs to another tab", async ({ page }) => {
  const secondTab = await page.context().newPage();
  const solver = await import(
    `../../src/challenges/${challenge.slug}/solve.ts`
  );
  const flag = await solver.solve(page);

  await secondTab.goto("/");
  await page.goto(`/c/${challenge.slug}/`);
  await page.fill('input[name="flag"]', flag);
  await page.getByRole("button", { name: "Check flag" }).click();

  await expect(page.getByText("Correct flag. Progress saved.")).toBeVisible();
  await expect(
    secondTab.locator(`[data-slug="${challenge.slug}"] [data-solved-glyph]`),
  ).toHaveText("Solved");

  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toMatchObject({
    v: 1,
    solved: {
      [challenge.slug]: {
        gaveUp: false,
      },
    },
  });

  await secondTab.close();
});

test("corrupt and future progress blobs are replaced safely", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{bad json"),
    progressKey,
  );
  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toEqual({ v: 1, solved: {}, hintsUsed: {} });

  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ v: 99, solved: { stale: {} } }),
      ),
    progressKey,
  );
  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toEqual({ v: 1, solved: {}, hintsUsed: {} });
});

test("solution reveal is explicit and marks give-up progress", async ({
  page,
}) => {
  await page.goto(`/c/${challenge.slug}/solution/`);

  await expect(page.getByText("Show solution?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Walkthrough" })).toBeHidden();

  await page.getByRole("button", { name: "Show me anyway" }).click();
  await expect(
    page.getByRole("heading", { name: "Walkthrough" }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toMatchObject({
    solved: {
      [challenge.slug]: {
        gaveUp: true,
      },
    },
  });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Walkthrough" }),
  ).toBeVisible();
});

test("progress export, import, and clear round-trip locally", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          solved: {
            "02-knox-client-auth": {
              at: 20,
              hintsUsed: 1,
              gaveUp: false,
            },
          },
          hintsUsed: {
            "02-knox-client-auth": 1,
          },
        }),
      ),
    progressKey,
  );

  await page.goto("/about/");
  await page.getByRole("button", { name: "Export" }).click();
  const payload = await page
    .locator("[data-progress-import-input]")
    .inputValue();

  await page.getByRole("button", { name: "Clear" }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toEqual({ v: 1, solved: {}, hintsUsed: {} });

  await page.locator("[data-progress-import-input]").fill(payload);
  await page.getByRole("button", { name: "Import" }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}"),
      progressKey,
    ),
  ).toMatchObject({
    solved: {
      "02-knox-client-auth": {
        hintsUsed: 1,
      },
    },
  });
});
