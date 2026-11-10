import type { State } from "./store";
import type { Card, Language, Progress, Unit } from "./types";
import { isDue } from "./srs";

export const cardKey = (c: Card) => `card:${c.id}`;

export function progressMap(s: State, profileId: string): Map<string, Progress> {
  return new Map(s.data.progress.filter((p) => p.profile_id === profileId).map((p) => [p.item_key, p]));
}

export type CardWithCtx = { card: Card; unit: Unit; lang: Language; p?: Progress };

export function cardsOf(s: State, profileId: string, filter?: { languageId?: string; unitId?: string }): CardWithCtx[] {
  const pm = progressMap(s, profileId);
  const langs = new Map(s.data.languages.map((l) => [l.id, l]));
  const units = new Map(
    s.data.units
      .filter((u) => u.profile_id === profileId && (!filter?.languageId || u.language_id === filter.languageId) && (!filter?.unitId || u.id === filter.unitId))
      .map((u) => [u.id, u]),
  );
  const out: CardWithCtx[] = [];
  for (const c of s.data.cards) {
    const unit = units.get(c.unit_id);
    if (!unit) continue;
    const lang = langs.get(unit.language_id);
    if (!lang) continue;
    out.push({ card: c, unit, lang, p: pm.get(cardKey(c)) });
  }
  return out;
}

export function boxCounts(ps: (Progress | undefined)[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const p of ps) counts[p?.box ?? 0]++;
  return counts;
}

export const dueCount = (ps: (Progress | undefined)[]) => ps.filter((p) => isDue(p)).length;

export function langsOfProfile(s: State, profileId: string): Language[] {
  const ids = new Set(s.data.units.filter((u) => u.profile_id === profileId).map((u) => u.language_id));
  return s.data.languages.filter((l) => ids.has(l.id)).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export const isKid = (grade: number) => grade > 0 && grade <= 4;
