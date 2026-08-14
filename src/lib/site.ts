export const SITE_URL = "https://ctfpawned.vercel.app";
export const SITE_TITLE = "ctfpawned";
export const SITE_DESCRIPTION =
  "Twelve browser-only web-security puzzles in a cat adoption agency with very bad engineering.";
export const SITE_IMAGE_PATH = "/og.png";

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}
