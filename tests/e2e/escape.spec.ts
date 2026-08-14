import { expect, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";
import { mountSandboxedTarget } from "./sandbox-harness";

const shellCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
const imageProbeUrl = "https://example.invalid/ctfpawned-probe.png";

function serializedParentStorage() {
  return JSON.stringify({ ...localStorage });
}

const parentShellPaths = [
  "/",
  "/about/",
  ...allChallengeMetas
    .filter((challenge) => challenge.status === "ready")
    .flatMap((challenge) => [
      `/c/${challenge.slug}/`,
      `/c/${challenge.slug}/solution/`,
    ]),
];

for (const shellPath of parentShellPaths) {
  test(`${shellPath} emits the strict shell CSP`, async ({ request }) => {
    const response = await request.get(shellPath);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toBe(shellCsp);
  });
}

for (const challenge of allChallengeMetas) {
  test(`${challenge.slug} target emits its own CSP`, async ({ request }) => {
    const response = await request.get(`/targets/${challenge.slug}.html`);
    const body = await response.text();

    expect(response.headers()["content-security-policy"]).toContain(
      "default-src 'none'",
    );
    expect(response.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'self'",
    );
    expect(body).toContain('http-equiv="Content-Security-Policy"');
    expect(body).toContain("ctfpawned-runtime");
  });

  test(`${challenge.slug} sandbox blocks parent and network escape`, async ({
    page,
  }) => {
    const frame = await mountSandboxedTarget(page, challenge.slug);
    const parentBefore = await page.evaluate(serializedParentStorage);
    const parentCookieBefore = await page.evaluate(() => document.cookie);
    const frameRequests: string[] = [];
    const frameFailures: string[] = [];
    const popups: string[] = [];

    page.on("popup", (popup) => popups.push(popup.url()));
    page.on("request", (request) => {
      if (request.frame() === frame) {
        frameRequests.push(request.url());
      }
    });
    page.on("requestfailed", (request) => {
      if (request.frame() === frame) {
        frameFailures.push(request.url());
      }
    });

    const result = await frame.evaluate(async () => {
      function capture(run: () => unknown) {
        try {
          const value = run();
          return { ok: true, value: String(value) };
        } catch (error) {
          return {
            ok: false,
            name: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }

      async function captureAsync(run: () => Promise<unknown>) {
        try {
          const value = await run();
          return { ok: true, value: String(value) };
        } catch (error) {
          return {
            ok: false,
            name: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }

      const imageAttempt = await new Promise<string>((resolve) => {
        const image = new Image();
        const timeout = window.setTimeout(() => resolve("timeout"), 300);
        image.onload = () => {
          window.clearTimeout(timeout);
          resolve("load");
        };
        image.onerror = () => {
          window.clearTimeout(timeout);
          resolve("error");
        };
        image.src = "https://example.invalid/ctfpawned-probe.png";
      });

      const cookieBefore = document.cookie;
      document.cookie = "escape_probe=1";

      window.parent.postMessage({ kind: "ctfpawned-probe" }, "*");

      return {
        parentDocument: capture(() => window.parent.document),
        topLocationHref: capture(() => window.top!.location.href),
        parentLocalStorage: capture(() => window.parent.localStorage),
        origin: window.origin,
        ownLocalStorage: capture(() => localStorage.getItem("x")),
        fetchRoot: await captureAsync(() => fetch("/")),
        imageAttempt,
        topNavigation: capture(() => {
          window.top!.location.href = "/pwned";
          return "assigned";
        }),
        openWindow: capture(() => window.open("/")),
        cookieBefore,
        cookieAfter: document.cookie,
      };
    });

    await page.waitForTimeout(500);

    expect(result.parentDocument.ok).toBe(false);
    expect(result.topLocationHref.ok).toBe(false);
    expect(result.parentLocalStorage.ok).toBe(false);
    expect(result.origin).toBe("null");
    expect(result.ownLocalStorage.ok).toBe(false);
    expect(result.fetchRoot.ok).toBe(false);
    expect(result.imageAttempt).not.toBe("load");
    if (result.openWindow.ok) {
      expect(result.openWindow.value).toBe("null");
    }
    expect(await page.evaluate(() => location.pathname)).not.toBe("/pwned");
    expect(await page.evaluate(() => window.__ctfpawnedParentProbe)).toBe(
      "clean",
    );
    expect(await page.evaluate(serializedParentStorage)).toBe(parentBefore);
    expect(await page.evaluate(() => document.cookie)).toBe(parentCookieBefore);
    expect(frameRequests.every((url) => url === imageProbeUrl)).toBe(true);
    expect(frameFailures.every((url) => url === imageProbeUrl)).toBe(true);
    if (frameRequests.length > 0) {
      expect(frameFailures).toContain(imageProbeUrl);
    }
    expect(popups).toEqual([]);
  });
}
