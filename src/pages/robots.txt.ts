import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/site";

export const GET: APIRoute = () =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /targets/",
      `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
