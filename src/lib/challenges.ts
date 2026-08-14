import { ChallengeMeta } from "./schema";

const modules = import.meta.glob<{ default: unknown }>(
  "../challenges/*/meta.json",
  { eager: true },
);

function parseChallenge(path: string, raw: unknown): ChallengeMeta {
  const parsed = ChallengeMeta.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Invalid challenge metadata at ${path}: ${parsed.error.message}`,
    );
  }

  const directorySlug = path.split("/").at(-2);

  if (directorySlug !== parsed.data.slug) {
    throw new Error(
      `Challenge slug mismatch at ${path}: directory is ${directorySlug}, metadata is ${parsed.data.slug}`,
    );
  }

  return parsed.data;
}

function assertUnique(challenges: ChallengeMeta[], field: keyof ChallengeMeta) {
  const seen = new Map<unknown, string>();

  for (const challenge of challenges) {
    const value = challenge[field];
    const priorSlug = seen.get(value);

    if (priorSlug) {
      throw new Error(
        `Duplicate challenge ${String(field)} '${String(value)}' in ${priorSlug} and ${challenge.slug}`,
      );
    }

    seen.set(value, challenge.slug);
  }
}

export const allChallenges = Object.entries(modules)
  .map(([path, module]) => parseChallenge(path, module.default))
  .sort((a, b) => a.order - b.order);

assertUnique(allChallenges, "slug");
assertUnique(allChallenges, "order");
assertUnique(allChallenges, "flagHash");

export function getVisibleChallenges(includeDrafts = false) {
  return allChallenges.filter(
    (challenge) => includeDrafts || challenge.status === "ready",
  );
}

export function getChallengeBySlug(slug: string, includeDrafts = false) {
  return getVisibleChallenges(includeDrafts).find(
    (challenge) => challenge.slug === slug,
  );
}
