import type { APIRoute } from "astro";
import { getVisibleChallenges } from "../lib/challenges";
import { absoluteUrl } from "../lib/site";

const staticRoutes = ["/", "/primer/", "/about/"];

function routeXml(pathname: string) {
  return [
    "  <url>",
    `    <loc>${absoluteUrl(pathname)}</loc>`,
    "  </url>",
  ].join("\n");
}

export const GET: APIRoute = () => {
  const challengeRoutes = getVisibleChallenges().flatMap((challenge) => [
    `/c/${challenge.slug}/`,
    `/c/${challenge.slug}/solution/`,
  ]);
  const routes = [...staticRoutes, ...challengeRoutes];

  return new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      routes.map(routeXml).join("\n"),
      "</urlset>",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
};
