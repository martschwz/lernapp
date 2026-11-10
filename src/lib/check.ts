// Prüft Antworten tolerant: mehrere Bedeutungen, Klammern, "to", Artikel, Tippfehler, Akzente.
export type CheckResult = "right" | "typo" | "accent" | "wrong";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(sb|sth|jdn|jdm|etw)\b\.?/g, " ")
    .replace(/[.!?"„“”'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l").replace(/ß/g, "ss").normalize("NFC");
}

const PREFIXES = ["to ", "sich ", "der ", "die ", "das ", "the ", "a ", "an "];

export function variants(s: string): string[] {
  const out = new Set<string>();
  for (const part of s.split(/[;,/]| oder | or /)) {
    const n = normalize(part);
    if (!n) continue;
    out.add(n);
    for (const p of PREFIXES) if (n.startsWith(p)) out.add(n.slice(p.length));
  }
  return [...out];
}

/** Editierdistanz, vertauschte Nachbarbuchstaben zählen als ein Fehler. */
export function levenshtein(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function checkAnswer(given: string, expected: string, lenient = false): CheckResult {
  if (!normalize(given)) return "wrong";
  const gs = variants(given);
  const ex = variants(expected);
  if (gs.some((g) => ex.includes(g))) return "right";
  const exPlain = ex.map(stripAccents);
  if (gs.some((g) => exPlain.includes(stripAccents(g)))) return "accent";
  for (const e of ex) {
    const tol = (e.length >= 9 ? 2 : e.length >= 4 ? 1 : 0) + (lenient ? 1 : 0);
    for (const g of gs) if (levenshtein(stripAccents(g), stripAccents(e)) <= tol) return "typo";
  }
  return "wrong";
}
