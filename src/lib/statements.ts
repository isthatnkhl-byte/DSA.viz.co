import statements from "../data/statements.json" with { type: "json" };

const map = (statements ?? {}) as Record<string, string>;

export function statementForSlug(slug: string): string {
  if (!slug) return "";
  let s = "";
  try {
    s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
  } catch {
    s = slug.toLowerCase().trim().replace(/\/+$/, "");
  }
  const direct = map[s];
  if (direct) return direct;
  const normalized = s.replace(/_/g, "-").replace(/\s+/g, "-");
  const normVal = map[normalized];
  if (normVal) return normVal;
  return "";
}
