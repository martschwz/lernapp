// Mathe-Aufgaben. Jede Aufgabe hat einen festen Schlüssel, damit der Karteikasten
// sich merken kann, welche Aufgaben schwerfallen (z. B. "mul:7:8" = 8 · 7).
export type MathTopic = "mul" | "div" | "big" | "sq" | "plusminus";

export const TOPICS: { id: MathTopic; name: string; hint: string; minGrade: number }[] = [
  { id: "mul", name: "Kleines 1×1", hint: "Malaufgaben bis 10 · 10", minGrade: 2 },
  { id: "div", name: "Geteilt", hint: "Die Umkehraufgaben zum 1×1", minGrade: 2 },
  { id: "plusminus", name: "Plus und Minus bis 1000", hint: "Kopfrechnen, immer neue Aufgaben", minGrade: 3 },
  { id: "big", name: "Großes 1×1", hint: "11 bis 20 mal 1 bis 10", minGrade: 4 },
  { id: "sq", name: "Quadratzahlen", hint: "1² bis 25²", minGrade: 5 },
];

export const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const CORE_ROWS = [1, 2, 5, 10];

export type MathItem = { key: string; prompt: string; answer: number; tracked: boolean };

/** Alle Aufgaben eines Themas (für Karteikasten-Themen). `rows` = gewählte Reihen. */
export function allKeys(topic: MathTopic, rows: number[] = ROWS): string[] {
  const keys: string[] = [];
  if (topic === "mul" || topic === "div") for (const r of rows) for (let b = 1; b <= 10; b++) keys.push(`${topic}:${r}:${b}`);
  if (topic === "big") for (let a = 11; a <= 20; a++) for (let b = 1; b <= 10; b++) keys.push(`big:${a}:${b}`);
  if (topic === "sq") for (let n = 1; n <= 25; n++) keys.push(`sq:${n}`);
  return keys;
}

export function itemFromKey(key: string): MathItem {
  const [t, x, y] = key.split(":");
  const a = Number(x), b = Number(y);
  switch (t) {
    case "mul": return { key, prompt: `${b} · ${a}`, answer: a * b, tracked: true };
    case "div": return { key, prompt: `${a * b} : ${a}`, answer: b, tracked: true };
    case "big": return { key, prompt: `${a} · ${b}`, answer: a * b, tracked: true };
    case "sq": return { key, prompt: `${a}²`, answer: a * a, tracked: true };
  }
  throw new Error("Unbekannte Aufgabe " + key);
}

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Zufallsaufgabe Plus/Minus bis 1000 (wird nicht im Karteikasten gespeichert). */
export function plusMinusItem(level: number): MathItem {
  const max = level <= 1 ? 100 : 1000;
  const plus = Math.random() < 0.5;
  const step = level <= 1 ? 1 : Math.random() < 0.5 ? 10 : 1;
  if (plus) {
    const a = rnd(1, max / step - 1) * step;
    const b = rnd(1, Math.max(1, (max - a) / step)) * step;
    return { key: "pm", prompt: `${a} + ${b}`, answer: a + b, tracked: false };
  }
  const a = rnd(2, max / step) * step;
  const b = rnd(1, a / step - 1 || 1) * step;
  return { key: "pm", prompt: `${a} − ${b}`, answer: a - b, tracked: false };
}

export function topicOfKey(key: string): MathTopic {
  return key.split(":")[0] as MathTopic;
}
