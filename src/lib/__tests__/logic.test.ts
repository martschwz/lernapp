import { describe, expect, it } from "vitest";
import { checkAnswer } from "../check";
import { nextState, streak, dayKey } from "../srs";
import { allKeys, itemFromKey, plusMinusItem } from "../math";
import { parseDelimited, parseText } from "../importers";

describe("checkAnswer", () => {
  it("akzeptiert eine von mehreren Bedeutungen", () => expect(checkAnswer("Urlaub", "Ferien; Urlaub")).toBe("right"));
  it("erlaubt fehlendes 'to'", () => expect(checkAnswer("arrive", "to arrive")).toBe("right"));
  it("ignoriert Klammern", () => expect(checkAnswer("ausleihen", "(sich) ausleihen")).toBe("right"));
  it("erkennt Tippfehler", () => expect(checkAnswer("suitcsae", "suitcase")).toBe("typo"));
  it("erkennt fehlende Akzente", () => expect(checkAnswer("zolw", "żółw")).toBe("accent"));
  it("lehnt Falsches ab", () => expect(checkAnswer("Hund", "Katze")).toBe("wrong"));
  it("lehnt leere Antwort ab", () => expect(checkAnswer("", "et")).toBe("wrong"));
});

describe("Karteikasten", () => {
  it("rückt bei richtig ein Fach weiter", () => {
    expect(nextState(0, true).box).toBe(2);
    expect(nextState(3, true).box).toBe(4);
    expect(nextState(6, true).box).toBe(6);
  });
  it("geht bei falsch zurück in Fach 1", () => expect(nextState(5, false).box).toBe(1));
  it("plant Fach 4 neun Tage später ein", () => {
    const now = new Date(2026, 0, 10, 15);
    expect(new Date(nextState(3, true, now).due).getDate()).toBe(19);
  });
  it("zählt die Lernserie", () => {
    const d = new Date(2026, 0, 10);
    const days = new Set([dayKey(new Date(2026, 0, 9)), dayKey(new Date(2026, 0, 8))]);
    expect(streak(days, d)).toBe(2);
  });
});

describe("Mathe", () => {
  it("hat 100 Aufgaben im kleinen 1×1", () => expect(allKeys("mul")).toHaveLength(100));
  it("rechnet richtig", () => {
    expect(itemFromKey("mul:7:8")).toMatchObject({ prompt: "8 · 7", answer: 56 });
    expect(itemFromKey("div:7:8")).toMatchObject({ prompt: "56 : 7", answer: 8 });
    expect(itemFromKey("sq:13").answer).toBe(169);
  });
  it("bleibt bei Plus/Minus im Zahlenraum", () => {
    for (let i = 0; i < 500; i++) {
      const it = plusMinusItem(2);
      expect(it.answer).toBeGreaterThanOrEqual(0);
      expect(it.answer).toBeLessThanOrEqual(1000);
    }
  });
});

describe("Import", () => {
  it("liest verschiedene Trenner und überspringt Kopfzeile", () => {
    expect(parseText("Englisch;Deutsch\nto arrive;ankommen\namicus = Freund = amici m\nbeach\tStrand")).toEqual([
      ["to arrive", "ankommen", ""], ["amicus", "Freund", "amici m"], ["beach", "Strand", ""],
    ]);
  });
});

describe("CSV wie aus Excel", () => {
  it("liest Semikolon-CSV mit Anführungszeichen", () => {
    const csv = '\uFEFFEnglisch;Deutsch;Hinweis\r\nout of;"von; aus … heraus";[ˈaʊt əv]\r\n"say ""hi""";"Hallo sagen";\r\n';
    expect(parseDelimited(csv)).toEqual([["out of", "von; aus … heraus", "[ˈaʊt əv]"], ['say "hi"', "Hallo sagen", ""]]);
  });
  it("liest Tabulator-getrennte Dateien", () => {
    expect(parseDelimited("bell\tGlocke\t[bel]")).toEqual([["bell", "Glocke", "[bel]"]]);
  });
});

import { checkForm, VERBS } from "../verbs";
describe("Unregelmäßige Verben", () => {
  it("akzeptiert eine oder beide Formen", () => {
    expect(checkForm("was", "was/were")).toBe(true);
    expect(checkForm("were", "was/were")).toBe(true);
    expect(checkForm("was/were", "was/were")).toBe(true);
    expect(checkForm("burned", "burnt/burned")).toBe(true);
  });
  it("Klammern und 'to' sind freiwillig", () => {
    expect(checkForm("dealt", "dealt (with)")).toBe(true);
    expect(checkForm("dealt with", "dealt (with)")).toBe(true);
    expect(checkForm("to wake up", "wake (up)")).toBe(true);
  });
  it("ist streng bei der Schreibweise", () => {
    expect(checkForm("goed", "went")).toBe(false);
    expect(checkForm("brough", "brought")).toBe(false);
    expect(checkForm("", "went")).toBe(false);
    expect(checkForm("was/wer", "was/were")).toBe(false);
  });
  it("hat keine doppelten Verben", () => {
    expect(new Set(VERBS.map((v) => v.inf)).size).toBe(VERBS.length);
  });
});
