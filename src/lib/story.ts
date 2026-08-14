import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type StoryAct = {
  id: 1 | 2 | 3;
  title: string;
  description: string;
};

export type StoryCatalog = {
  acts: StoryAct[];
  enabled: boolean;
};

const fallbackActs: StoryAct[] = [
  {
    id: 1,
    title: "Challenges",
    description: "The challenge catalog is available without story metadata.",
  },
  {
    id: 2,
    title: "Challenges",
    description: "The challenge catalog is available without story metadata.",
  },
  {
    id: 3,
    title: "Challenges",
    description: "The challenge catalog is available without story metadata.",
  },
];

function isStoryAct(value: unknown): value is StoryAct {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<StoryAct>;
  return (
    (candidate.id === 1 || candidate.id === 2 || candidate.id === 3) &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

export function getStoryCatalog(
  storyPath = path.join(process.cwd(), "src", "content", "story.json"),
): StoryCatalog {
  if (!existsSync(storyPath)) {
    return { acts: fallbackActs, enabled: false };
  }

  try {
    const parsed = JSON.parse(readFileSync(storyPath, "utf8")) as {
      acts?: unknown;
    };
    const acts = Array.isArray(parsed.acts)
      ? parsed.acts.filter(isStoryAct)
      : [];

    return {
      acts: acts.length === 3 ? acts : fallbackActs,
      enabled: acts.length === 3,
    };
  } catch {
    return { acts: fallbackActs, enabled: false };
  }
}
