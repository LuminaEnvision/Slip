export function slugBaseFromName(name: string): string {
  const head = name.split(/\s*[—–]\s*|\s+-\s+|,\s*/)[0] ?? name;
  const slug = head
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "payee";
}
