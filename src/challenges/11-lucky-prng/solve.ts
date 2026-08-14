import type { Page } from "@playwright/test";

export async function solve(page: Page) {
  await page.goto("/targets/11-lucky-prng.html");
  const prediction = await page.evaluate(() => {
    const note = document.querySelector<HTMLElement>("#note");
    if (!note) throw new Error("Generator note is missing");

    const modulus = Number(note.dataset.modulus);
    const multiplier = Number(note.dataset.multiplier);
    const minSeed = Number(note.dataset.minSeed);
    const maxSeed = Number(note.dataset.maxSeed);
    const observed: string[] = Array.from(
      document.querySelectorAll("#tokens li"),
      (item) => item.textContent ?? "",
    );
    const nextState = (state: number) => (state * multiplier) % modulus;
    const tokenFromState = (state: number) =>
      "nl-" + state.toString(36).padStart(7, "0").slice(-7);
    for (let seed = minSeed; seed <= maxSeed; seed += 1) {
      let state = seed;
      const produced: string[] = [];
      for (let index = 0; index < 4; index += 1) {
        state = nextState(state);
        produced.push(tokenFromState(state));
      }
      if (observed.every((token, index) => token === produced[index])) {
        return produced[3];
      }
    }
    throw new Error("seed not found");
  });
  await page.fill("#prediction", prediction);
  await page.click("#submit");
  return page.locator("#flag").textContent();
}
