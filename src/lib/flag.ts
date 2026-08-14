function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashFlag(slug: string, input: string) {
  const normalized = input.trim().toLowerCase();
  const bytes = new TextEncoder().encode(`${slug}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return toHex(digest);
}

export async function verifyFlag(
  slug: string,
  input: string,
  expectedHash: string,
) {
  return (await hashFlag(slug, input)) === expectedHash;
}
