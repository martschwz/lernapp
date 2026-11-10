// Karteikasten: Fach 0 = neu, Fächer 1–6. Tage bis zur nächsten Abfrage je Fach.
export const INTERVAL_DAYS = [0, 0, 1, 3, 9, 29, 90];
export const BOX_COLORS = ["var(--muted)", "var(--box1)", "var(--box2)", "var(--box3)", "var(--box4)", "var(--box5)", "var(--box6)"];
export const boxLabel = (b: number) => (b === 0 ? "neu" : `Fach ${b}`);

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayKey(d = new Date()): string {
  const x = startOfDay(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

/** Neues Fach und Fälligkeit nach einer Antwort. */
export function nextState(box: number, correct: boolean, now = new Date()): { box: number; due: string } {
  const newBox = correct ? Math.min(6, Math.max(1, box) + 1) : 1;
  const due = startOfDay(now);
  due.setDate(due.getDate() + INTERVAL_DAYS[newBox]);
  return { box: newBox, due: due.toISOString() };
}

export function isDue(p: { box: number; due: string } | undefined, now = new Date()): boolean {
  if (!p || p.box === 0) return true;
  return new Date(p.due).getTime() <= now.getTime();
}

/** Lernserie: aufeinanderfolgende Tage mit Antworten, bis heute oder gestern. */
export function streak(days: Set<string>, now = new Date()): number {
  const d = startOfDay(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
