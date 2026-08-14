const catArtModules = import.meta.glob<string>("../assets/cats/*.svg", {
  eager: true,
  import: "default",
  query: "?raw",
});

export function getCatArt(slug: string) {
  return catArtModules[`../assets/cats/${slug}.svg`] ?? "";
}
