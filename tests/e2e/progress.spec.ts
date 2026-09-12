import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { allChallengeMetas } from "./challenge-fixtures";

const progressKey = "ctfpawned:progress";

test("unrelated and future imports preserve the existing solved record", async ({
  page,
}) => {
  let confirmations = 0;
  page.on("dialog", async (dialog) => {
    confirmations += 1;
    await dialog.accept();
  });
  await page.goto("/about/");
  const original = {
    v: 1,
    solved: {
      "01-scrambles-encoding": { at: 100, hintsUsed: 2, gaveUp: false },
    },
    hintsUsed: { "01-scrambles-encoding": 2 },
  };
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: progressKey, value: original },
  );
  await page.reload();
  for (const payload of [
    { unrelated: "not a backup" },
    { v: 99, solved: {}, hintsUsed: {} },
    { v: 1, solved: [], hintsUsed: {} },
  ]) {
    await page
      .locator("[data-progress-import-input]")
      .fill(Buffer.from(JSON.stringify(payload)).toString("base64"));
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.locator("[data-progress-tools-status]")).toHaveText(
      "Import payload is malformed.",
    );
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        progressKey,
      ),
    ).toEqual(original);
  }
  expect(confirmations).toBe(0);
});

test("the browser migrates a confirmed legacy progress backup", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/about/");
  const legacy = {
    solved: ["01-scrambles-encoding"],
    hintsUsed: { "01-scrambles-encoding": 2 },
  };
  await page
    .locator("[data-progress-import-input]")
    .fill(Buffer.from(JSON.stringify(legacy)).toString("base64"));
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.locator("[data-progress-tools-status]")).toHaveText(
    "Progress imported.",
  );
  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      progressKey,
    ),
  ).toEqual({
    v: 1,
    solved: { "01-scrambles-encoding": { at: 0, hintsUsed: 2, gaveUp: false } },
    hintsUsed: legacy.hintsUsed,
  });
});
const challenge = allChallengeMetas.find(
  (candidate) => candidate.slug === "01-scrambles-encoding",
)!;

test("a full store keeps solved progress available as a download", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("full", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, progressKey);
  const solver = await import(
    `../../src/challenges/${challenge.slug}/solve.ts`
  );
  const flag = await solver.solve(page);
  await page.goto(`/c/${challenge.slug}/`);
  await page.fill('input[name="flag"]', flag);
  await page.getByRole("button", { name: "Check flag" }).click();
  await expect(page.locator("[data-flag-result]")).toContainText(
    "Progress is temporary",
  );
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download current progress", exact: true })
    .click();
  const download = await downloading;
  const backup = await readFile((await download.path())!, "utf8");
  expect(
    JSON.parse(Buffer.from(backup, "base64").toString("utf8")).solved[
      challenge.slug
    ].gaveUp,
  ).toBe(false);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), progressKey),
  ).toBeNull();
});

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

test("corrupt and future progress stays intact and can be downloaded", async ({
  page,
}, testInfo) => {
  await page.goto("/about/");
  for (const raw of [
    "{bad json",
    JSON.stringify({ v: 99, solved: { stale: { at: 123 } } }),
  ]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: progressKey,
      value: raw,
    });
    await page.reload();
    expect(
      await page.evaluate((key) => localStorage.getItem(key), progressKey),
    ).toBe(raw);
    await expect(page.locator("[data-progress-storage-warning]")).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download original save", exact: true })
      .click();
    const download = await downloading;
    expect(await readFile((await download.path())!, "utf8")).toBe(raw);
  }
  await page
    .locator("[data-progress-storage-warning]")
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("progress-recovery.png") });
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
