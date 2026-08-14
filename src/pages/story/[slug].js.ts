import { getVisibleChallenges } from "../../lib/challenges";
import { parseRecoveredSection } from "../../lib/content-parts";

const solutionModules = import.meta.glob<string>(
  "../../challenges/*/solution.mdx",
  { eager: true, import: "default", query: "?raw" },
);

export function getStaticPaths() {
  return getVisibleChallenges(!import.meta.env.PROD).map((challenge) => {
    const raw =
      solutionModules[`../../challenges/${challenge.slug}/solution.mdx`] ?? "";

    return {
      params: { slug: challenge.slug },
      props: { recovered: parseRecoveredSection(raw) },
    };
  });
}

export function GET({ props }: { props: { recovered: string } }) {
  return new Response(`export default ${JSON.stringify(props.recovered)};\n`, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "application/javascript; charset=utf-8",
    },
  });
}
