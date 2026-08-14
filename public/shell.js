function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashFlag(slug, input) {
  const normalized = input.trim().toLowerCase();
  const bytes = new TextEncoder().encode(`${slug}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return toHex(digest);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reset-target]");
  if (!button) return;

  const frame = document.getElementById(button.dataset.resetTarget);
  if (frame instanceof HTMLIFrameElement) {
    frame.src = frame.src;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-flag-check]");
  if (!form) return;

  event.preventDefault();
  const input = form.elements.namedItem("flag");
  const output = form.querySelector("[data-flag-result]");
  if (
    !(input instanceof HTMLInputElement) ||
    !(output instanceof HTMLOutputElement)
  ) {
    return;
  }

  const actualHash = await hashFlag(form.dataset.slug || "", input.value);
  const valid = actualHash === form.dataset.hash;
  output.className = `flag-result flag-result-${valid ? "valid" : "invalid"}`;
  output.textContent = valid ? "Correct flag" : "Try again";
});
