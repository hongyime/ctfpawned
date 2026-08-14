const progressKey = "ctfpawned:progress";
const progressVersion = 1;

function defaultProgress() {
  return {
    v: progressVersion,
    solved: {},
    hintsUsed: {},
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCount(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function migrateProgress(raw) {
  if (!isObject(raw) || raw.v !== progressVersion) return defaultProgress();

  const solved = {};
  for (const [slug, entry] of Object.entries(raw.solved || {})) {
    if (!isObject(entry)) continue;
    solved[slug] = {
      at: safeCount(entry.at),
      hintsUsed: safeCount(entry.hintsUsed),
      gaveUp: entry.gaveUp === true,
    };
  }

  const hintsUsed = {};
  for (const [slug, count] of Object.entries(raw.hintsUsed || {})) {
    hintsUsed[slug] = safeCount(count);
  }

  return { v: progressVersion, solved, hintsUsed };
}

function base64Encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(encoded) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readProgress() {
  try {
    const encoded = localStorage.getItem(progressKey);
    const progress = encoded
      ? migrateProgress(JSON.parse(encoded))
      : defaultProgress();
    localStorage.setItem(progressKey, JSON.stringify(progress));
    return progress;
  } catch {
    const progress = defaultProgress();
    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
      return progress;
    }
    return progress;
  }
}

function writeProgress(progress) {
  const next = migrateProgress(progress);
  localStorage.setItem(progressKey, JSON.stringify(next));
  renderProgress(next);
  return next;
}

function updateProgress(update) {
  return writeProgress(update(readProgress()));
}

function markHintUsed(slug, count) {
  updateProgress((progress) => {
    progress.hintsUsed[slug] = Math.max(
      safeCount(progress.hintsUsed[slug]),
      count,
    );
    if (progress.solved[slug]) {
      progress.solved[slug].hintsUsed = Math.max(
        progress.solved[slug].hintsUsed,
        progress.hintsUsed[slug],
      );
    }
    return progress;
  });
}

function markSolved(slug, options = {}) {
  updateProgress((progress) => {
    const existing = progress.solved[slug];
    const hintsUsed = Math.max(
      safeCount(options.hintsUsed),
      safeCount(progress.hintsUsed[slug]),
      existing?.hintsUsed || 0,
    );
    progress.hintsUsed[slug] = hintsUsed;
    progress.solved[slug] = {
      at: existing?.at || options.at || Date.now(),
      hintsUsed,
      gaveUp: existing?.gaveUp === true || options.gaveUp === true,
    };
    return progress;
  });
}

function encodeExport(progress) {
  return base64Encode(JSON.stringify(migrateProgress(progress)));
}

function decodeImport(encoded) {
  return migrateProgress(JSON.parse(base64Decode(encoded.trim())));
}

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

function renderProgress(progress = readProgress()) {
  const solvedSlugs = new Set(Object.keys(progress.solved));
  const cards = [...document.querySelectorAll("[data-challenge-card]")];
  const total =
    cards.length ||
    Number(document.querySelector("[data-progress-meter]")?.max) ||
    0;
  const solvedCount = total
    ? cards.filter((card) => solvedSlugs.has(card.dataset.slug || "")).length
    : solvedSlugs.size;

  for (const card of cards) {
    const solved = solvedSlugs.has(card.dataset.slug || "");
    const glyph = card.querySelector("[data-solved-glyph]");
    card.classList.toggle("challenge-card-solved", solved);
    if (glyph) {
      glyph.textContent = solved ? "Solved" : "Unsolved";
      glyph.setAttribute("aria-label", solved ? "Solved" : "Unsolved");
    }
  }

  for (const summary of document.querySelectorAll("[data-progress-summary]")) {
    summary.textContent = `${solvedCount}/${total || solvedCount} solved`;
  }

  for (const detail of document.querySelectorAll("[data-progress-detail]")) {
    detail.textContent = solvedCount
      ? "Recovered notes unlock as you solve."
      : "Start anywhere.";
  }

  for (const meter of document.querySelectorAll("[data-progress-meter]")) {
    meter.value = solvedCount;
  }

  for (const count of document.querySelectorAll(
    "[data-progress-tools-count]",
  )) {
    count.textContent = `${solvedSlugs.size} solved`;
  }

  renderStory(progress);
  renderHintDrawers(progress);
  renderSolutionGate(progress);
}

async function renderStory(progress = readProgress()) {
  const fragments = [...document.querySelectorAll("[data-story-fragment]")];
  if (!fragments.length) return;

  let recovered = 0;
  for (const fragment of fragments) {
    const slug = fragment.dataset.slug || "";
    const text = fragment.querySelector("[data-story-text]");
    if (!text) continue;

    if (!progress.solved[slug]) {
      fragment.classList.remove("story-fragment-open");
      text.textContent = "Redacted until this challenge is solved.";
      continue;
    }

    recovered += 1;
    fragment.classList.add("story-fragment-open");
    try {
      const module = await import(`/story/${slug}.js`);
      text.textContent = module.default || "Recovered note unavailable.";
    } catch {
      text.textContent = "Recovered note unavailable.";
    }
  }

  for (const status of document.querySelectorAll("[data-story-status]")) {
    status.textContent = `${recovered}/${fragments.length} recovered`;
  }
}

async function revealHints(drawer, targetCount) {
  const slug = drawer.dataset.slug || "";
  const hintCount = Number(drawer.dataset.hintCount || "0");
  const list = drawer.querySelector("[data-hint-list]");
  const button = drawer.querySelector("[data-hint-next]");
  const status = drawer.querySelector("[data-hint-status]");
  const label = drawer.querySelector("[data-hint-count-label]");
  if (!list || !button || hintCount <= 0) return;

  list.replaceChildren();
  for (let index = 1; index <= Math.min(targetCount, hintCount); index += 1) {
    const item = document.createElement("li");
    item.className = "hint-item";
    item.textContent = "Loading hint...";
    list.append(item);

    try {
      const module = await import(`/hints/${slug}/${index}.js`);
      item.textContent = module.default || "Hint unavailable.";
    } catch {
      item.textContent = "Hint unavailable.";
    }
  }

  if (label)
    label.textContent = `${Math.min(targetCount, hintCount)}/${hintCount} revealed`;
  button.hidden = targetCount >= hintCount;
  if (status) {
    status.textContent =
      targetCount >= hintCount ? "All hints revealed." : "Next hint is ready.";
  }
}

function renderHintDrawers(progress = readProgress()) {
  for (const drawer of document.querySelectorAll("[data-hint-drawer]")) {
    const slug = drawer.dataset.slug || "";
    const count = safeCount(progress.hintsUsed[slug]);
    revealHints(drawer, count);
  }
}

function renderSolutionGate(progress = readProgress()) {
  const gate = document.querySelector("[data-solution-gate]");
  if (!gate) return;

  const slug = gate.dataset.slug || "";
  const prompt = gate.querySelector("[data-solution-prompt]");
  const content = gate.querySelector("[data-solution-content]");
  const gaveUp = progress.solved[slug]?.gaveUp === true;
  if (!content) return;

  if (gaveUp) {
    content.hidden = false;
    if (prompt) prompt.hidden = true;
  } else {
    content.hidden = true;
    if (prompt) prompt.hidden = false;
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reset-target]");
  if (!button) return;

  const frame = document.getElementById(button.dataset.resetTarget);
  if (frame instanceof HTMLIFrameElement) {
    frame.src = frame.src;
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-hint-next]");
  if (!button) return;

  const drawer = button.closest("[data-hint-drawer]");
  if (!drawer) return;

  const slug = drawer.dataset.slug || "";
  const progress = readProgress();
  const nextCount = safeCount(progress.hintsUsed[slug]) + 1;
  markHintUsed(slug, nextCount);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-solution-reveal]");
  if (!button) return;

  const gate = button.closest("[data-solution-gate]");
  if (!gate) return;

  markSolved(gate.dataset.slug || "", { gaveUp: true });
});

document.addEventListener("click", (event) => {
  const exportButton = event.target.closest("[data-progress-export]");
  if (exportButton) {
    const input = document.querySelector("[data-progress-import-input]");
    const status = document.querySelector("[data-progress-tools-status]");
    const payload = encodeExport(readProgress());
    if (input) input.value = payload;
    if (status) status.textContent = "Progress exported.";
    return;
  }

  const importButton = event.target.closest("[data-progress-import]");
  if (importButton) {
    const input = document.querySelector("[data-progress-import-input]");
    const status = document.querySelector("[data-progress-tools-status]");
    if (!input?.value.trim()) {
      if (status) status.textContent = "Paste an export payload first.";
      return;
    }
    if (!confirm("Replace local progress with this import?")) return;
    try {
      writeProgress(decodeImport(input.value));
      if (status) status.textContent = "Progress imported.";
    } catch {
      if (status) status.textContent = "Import payload is malformed.";
    }
    return;
  }

  const clearButton = event.target.closest("[data-progress-clear]");
  if (clearButton) {
    const status = document.querySelector("[data-progress-tools-status]");
    if (!confirm("Clear local ctfpawned progress?")) return;
    writeProgress(defaultProgress());
    if (status) status.textContent = "Progress cleared.";
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
  output.textContent = valid ? "Correct flag. Progress saved." : "Try again.";

  if (valid) {
    markSolved(form.dataset.slug || "");
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === progressKey) renderProgress(readProgress());
});

renderProgress();
