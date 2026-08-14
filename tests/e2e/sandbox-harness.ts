import { expect, type Frame, type Page } from "@playwright/test";

export async function mountSandboxedTarget(page: Page, slug: string) {
  await page.goto("/");
  await page.evaluate((targetSlug) => {
    localStorage.setItem("ctfpawned:parent-probe", "safe");
    window.__ctfpawnedParentProbe = "clean";
    document.body.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.dataset.target = targetSlug;
    iframe.sandbox.add("allow-scripts");
    iframe.referrerPolicy = "no-referrer";
    iframe.src = `/targets/${targetSlug}.html`;
    document.body.appendChild(iframe);
  }, slug);

  let frame: Frame | null = null;
  await expect
    .poll(async () => {
      frame =
        page
          .frames()
          .find((candidate) =>
            candidate.url().endsWith(`/targets/${slug}.html`),
          ) ?? null;
      return frame !== null;
    })
    .toBe(true);

  await frame!.waitForLoadState("domcontentloaded");
  return frame!;
}

declare global {
  interface Window {
    __ctfpawnedParentProbe?: string;
  }
}
