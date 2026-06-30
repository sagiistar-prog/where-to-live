export function parseJsonText(raw: string) {
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
}
