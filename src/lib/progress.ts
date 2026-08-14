import { persistentAtom } from "@nanostores/persistent";

export const PROGRESS_STORAGE_KEY = "ctfpawned:progress";
export const PROGRESS_VERSION = 1;

export type SolvedChallenge = {
  at: number;
  hintsUsed: number;
  gaveUp: boolean;
};

export type Progress = {
  v: typeof PROGRESS_VERSION;
  solved: Record<string, SolvedChallenge>;
  hintsUsed: Record<string, number>;
};

type StorageLike = {
  [key: string]: string | undefined;
};

export function defaultProgress(): Progress {
  return {
    v: PROGRESS_VERSION,
    solved: {},
    hintsUsed: {},
  };
}

function base64Encode(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }

  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(encoded: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function normalizeSolved(value: unknown): Record<string, SolvedChallenge> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([slug, entry]) =>
      isRecord(entry)
        ? [
            [
              slug,
              {
                at: safeCount(entry.at),
                hintsUsed: safeCount(entry.hintsUsed),
                gaveUp: entry.gaveUp === true,
              },
            ],
          ]
        : [],
    ),
  );
}

function normalizeHints(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([slug, count]) => [slug, safeCount(count)]),
  );
}

export function migrate(raw: unknown): Progress {
  if (!isRecord(raw)) return defaultProgress();

  if (raw.v === PROGRESS_VERSION) {
    return {
      v: PROGRESS_VERSION,
      solved: normalizeSolved(raw.solved),
      hintsUsed: normalizeHints(raw.hintsUsed),
    };
  }

  if (raw.v === undefined && Array.isArray(raw.solved)) {
    return {
      v: PROGRESS_VERSION,
      solved: Object.fromEntries(
        raw.solved
          .filter((slug): slug is string => typeof slug === "string")
          .map((slug) => [
            slug,
            {
              at: 0,
              hintsUsed: safeCount(
                isRecord(raw.hintsUsed) ? raw.hintsUsed[slug] : 0,
              ),
              gaveUp: false,
            },
          ]),
      ),
      hintsUsed: normalizeHints(raw.hintsUsed),
    };
  }

  return defaultProgress();
}

export function decodeProgress(encoded: string | null | undefined): Progress {
  if (!encoded) return defaultProgress();

  try {
    return migrate(JSON.parse(encoded));
  } catch {
    return defaultProgress();
  }
}

export function encodeProgress(value: Progress): string {
  return JSON.stringify(migrate(value));
}

export function repairStoredProgress(storage: StorageLike): Progress {
  const repaired = decodeProgress(storage[PROGRESS_STORAGE_KEY]);
  storage[PROGRESS_STORAGE_KEY] = encodeProgress(repaired);
  return repaired;
}

export function markHintUsed(
  value: Progress,
  slug: string,
  hintsUsed: number,
): Progress {
  const progress = migrate(value);
  const count = safeCount(hintsUsed);

  return {
    ...progress,
    hintsUsed: {
      ...progress.hintsUsed,
      [slug]: count,
    },
    solved: progress.solved[slug]
      ? {
          ...progress.solved,
          [slug]: {
            ...progress.solved[slug],
            hintsUsed: Math.max(progress.solved[slug].hintsUsed, count),
          },
        }
      : progress.solved,
  };
}

export function markSolved(
  value: Progress,
  slug: string,
  options: { at?: number; hintsUsed?: number; gaveUp?: boolean } = {},
): Progress {
  const progress = migrate(value);
  const existing = progress.solved[slug];
  const hintsUsed = Math.max(
    safeCount(options.hintsUsed),
    safeCount(progress.hintsUsed[slug]),
    existing?.hintsUsed ?? 0,
  );

  return {
    ...progress,
    hintsUsed: {
      ...progress.hintsUsed,
      [slug]: hintsUsed,
    },
    solved: {
      ...progress.solved,
      [slug]: {
        at: existing?.at || options.at || Date.now(),
        hintsUsed,
        gaveUp: existing?.gaveUp === true || options.gaveUp === true,
      },
    },
  };
}

export function markGaveUp(value: Progress, slug: string): Progress {
  return markSolved(value, slug, { gaveUp: true });
}

export function exportProgress(value: Progress): string {
  const json = encodeProgress(value);
  return base64Encode(json);
}

export function importProgress(encoded: string): Progress {
  const trimmed = encoded.trim();
  const json = base64Decode(trimmed);

  return migrate(JSON.parse(json));
}

export const progress = persistentAtom<Progress>(
  PROGRESS_STORAGE_KEY,
  defaultProgress(),
  {
    decode: decodeProgress,
    encode: encodeProgress,
  },
);
