import { getVisibleChallenges } from "../../../lib/challenges";
import { parseHintSections } from "../../../lib/content-parts";

const hintModules = import.meta.glob<string>(
  "../../../challenges/*/hints.mdx",
  { eager: true, import: "default", query: "?raw" },
);

export function getStaticPaths() {
  return getVisibleChallenges(!import.meta.env.PROD).flatMap((challenge) => {
    const raw =
      hintModules[`../../../challenges/${challenge.slug}/hints.mdx`] ?? "";
    return parseHintSections(raw).map((hint, index) => ({
      params: { slug: challenge.slug, hint: String(index + 1) },
      props: { hint },
    }));
  });
}

export function GET({ props }: { props: { hint: string } }) {
  return new Response(`export default ${JSON.stringify(props.hint)};\n`, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "application/javascript; charset=utf-8",
    },
  });
}
