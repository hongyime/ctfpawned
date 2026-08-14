import { webcrypto } from "node:crypto";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: pnpm flag <slug>");
  process.exit(1);
}

function randomBase32(length) {
  const bytes = webcrypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const flag = `ctfpawned{${randomBase32(26)}}`;
const normalized = flag.trim().toLowerCase();
const digest = await webcrypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(`${slug}:${normalized}`),
);

console.log(flag);
console.log(toHex(digest));
