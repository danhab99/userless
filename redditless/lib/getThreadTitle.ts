export function getThreadTitle(p: string) {
  const titleIndex = p.indexOf("\n");
  const title = p.slice(0, titleIndex).replace(/^#/, "");
  const body = p.slice(titleIndex);

  return [title, body] as const;
}
