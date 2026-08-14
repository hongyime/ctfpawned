import { expect, test } from "@playwright/test";
import { allChallengeMetas } from "./challenge-fixtures";
import { mountSandboxedTarget } from "./sandbox-harness";

const probeChallenge = allChallengeMetas[0];

test("records crypto.subtle behavior in an opaque-origin target", async ({
  page,
}, testInfo) => {
  const frame = await mountSandboxedTarget(page, probeChallenge.slug);
  const result = await frame.evaluate(async () => {
    const bytes = new TextEncoder().encode("ctfpawned");
    let digest = "missing";

    if (crypto.subtle) {
      try {
        const value = await crypto.subtle.digest("SHA-256", bytes);
        digest = Array.from(new Uint8Array(value), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
      } catch (error) {
        digest = `error:${error instanceof Error ? error.name : "UnknownError"}:${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return {
      origin: window.origin,
      isSecureContext,
      hasSubtle: Boolean(crypto.subtle),
      digest,
    };
  });

  testInfo.annotations.push({
    type: "crypto-subtle-opaque-origin",
    description: JSON.stringify(result),
  });

  expect(result.origin).toBe("null");
  expect(result.digest).toMatch(/^(missing|error:|[a-f0-9]{64}$)/);
});
