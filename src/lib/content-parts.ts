export function parseHintSections(markdown: string): string[] {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/^##\s+Hint\s*$/gim)
    .slice(1)
    .map((section) => section.trim())
    .filter(Boolean);
}

export function parseRecoveredSection(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const heading = /^##\s+Recovered\s*$/gim.exec(normalized);

  if (!heading) return "";

  const start = heading.index + heading[0].length;
  const rest = normalized.slice(start);
  const nextHeading = rest.search(/^##\s+/im);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

  return section.trim();
}
