import { useMemo, useState } from "react";
import { getState, newId, remove, upsert, useStore, type Card, type Profile, type Unit } from "../lib/store";
import { cardKey, cardsOf, dueCount, langsOfProfile, type CardWithCtx } from "../lib/selectors";
import { BOX_COLORS, isDue, shuffle } from "../lib/srs";
import { normalize } from "../lib/check";
import { Quiz, Summary, type QuizItem, type QuizMode, type QuizResult } from "../components/Quiz";
import { Confirm, Seg, Tag, toast } from "../components/ui";

type Dir = "auto" | "de" | "fs" | "mix";

/* ---------------- Lernen ---------------- */
export function Learn({ profile, initialLanguageId, onHome }: { profile: Profile; initialLanguageId?: string; onHome: () => void }) {
  const s = useStore((x) => x);
  const langs = langsOfProfile(s, profile.id);
  const [langId, setLangId] = useState(initialLanguageId ?? langs[0]?.id ?? "");
  const [sel, setSel] = useState("due");
  const [mode, setMode] = useState<QuizMode>(profile.grade && profile.grade <= 4 ? "card" : "type");
  const [dir, setDir] = useState<Dir>("auto");
  const [size, setSize] = useState(profile.grade && profile.grade <= 4 ? 10 : 20);
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const lang = langs.find((l) => l.id === langId) ?? langs[0];
  if (!lang) return <section className="card narrow"><p>Noch keine Vokabeln vorhanden. Lege zuerst unter „Importieren“ eine Lektion an.</p></section>;
  const units = s.data.units.filter((u) => u.profile_id === profile.id && u.language_id === lang.id).sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  const all = cardsOf(s, profile.id, { languageId: lang.id });

  function toItem(c: CardWithCtx, pool: CardWithCtx[]): QuizItem {
    const d = dir === "mix" ? (Math.random() < 0.5 ? "de" : "fs") : dir === "auto" ? c.lang.default_dir : dir;
    const toFs = d === "de";
    const answer = toFs ? c.card.term : c.card.translation;
    const others = shuffle(pool.filter((o) => o.card.id !== c.card.id).map((o) => (toFs ? o.card.term : o.card.translation)));
    return {
      key: cardKey(c.card),
      prompt: toFs ? c.card.translation : c.card.term,
      answer,
      info: c.card.info,
      showInfoInQuestion: !toFs && !!c.card.info && c.lang.short === "LA",
      from: toFs ? "Deutsch" : c.lang.name,
      to: toFs ? c.lang.name : "Deutsch",
      tag: { short: c.lang.short, color: c.lang.color },
      context: c.unit.name,
      speakText: c.card.term,
      speakLang: c.lang.tts,
      speakInQuestion: !toFs,
      chars: toFs ? c.lang.chars : "äöüß",
      lenient: c.lang.lenient,
      options: shuffle([answer, ...[...new Set(others)].filter((o) => o !== answer).slice(0, 3)]),
    };
  }

  function start(pool?: CardWithCtx[]) {
    let p = pool ?? all;
    if (!pool) {
      if (sel === "due") p = p.filter((c) => isDue(c.p));
      else if (sel !== "all") p = p.filter((c) => c.unit.id === sel);
      p = shuffle(p).sort((a, b) => Number(isDue(b.p)) - Number(isDue(a.p)) || (a.p?.box ?? 0) - (b.p?.box ?? 0)).slice(0, Math.max(5, Math.min(100, size)));
    }
    if (!p.length) { toast("Keine Vokabeln für diese Auswahl"); return; }
    setResult(null);
    setItems(shuffle(p).map((c) => toItem(c, all)));
  }

  if (result) return <Summary result={result} onHome={onHome} onRetry={() => {
    const keys = new Set(result.wrongItems.map((w) => w.key));
    start(all.filter((c) => keys.has(cardKey(c.card))));
  }} />;
  if (items) return <Quiz items={items} mode={mode} profileId={profile.id} onDone={(r) => { setItems(null); setResult(r); }} onQuit={(r) => { setItems(null); if (r.right + r.wrong) setResult(r); }} />;

  return (
    <section className="card grid narrow">
      <h2>Was möchtest du üben?</h2>
      <div className="grid" style={{ gap: 6 }}><span className="small muted" style={{ fontWeight: 700 }}>Sprache</span>
        <Seg value={lang.id} options={langs.map((l) => [l.id, l.name])} onChange={(v) => { setLangId(v); setSel("due"); }} />
      </div>
      <label className="f">Vokabeln
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="due">Alle fälligen ({dueCount(all.map((c) => c.p))})</option>
          <option value="all">Alle aus {lang.name} ({all.length})</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({all.filter((c) => c.unit.id === u.id).length})</option>)}
        </select>
      </label>
      <div className="grid" style={{ gap: 6 }}><span className="small muted" style={{ fontWeight: 700 }}>Abfrageart</span>
        <Seg value={mode} options={[["type", "Eintippen"], ["mc", "Auswahl"], ["card", "Karteikarte"]]} onChange={setMode} />
      </div>
      <div className="grid" style={{ gap: 6 }}><span className="small muted" style={{ fontWeight: 700 }}>Richtung</span>
        <Seg value={dir} options={[["auto", "Empfohlen"], ["de", `Deutsch → ${lang.name}`], ["fs", `${lang.name} → Deutsch`], ["mix", "Gemischt"]]} onChange={setDir} />
        <span className="small muted">Empfohlen für {lang.name}: {lang.default_dir === "fs" ? `${lang.name} → Deutsch` : `Deutsch → ${lang.name}`} (änderbar in den Einstellungen)</span>
      </div>
      <label className="f" style={{ maxWidth: 200 }}>Karten pro Runde<input type="number" min={5} max={100} value={size} onChange={(e) => setSize(Number(e.target.value) || 20)} /></label>
      <div><button className="btn primary big" onClick={() => start()}>Runde starten</button></div>
    </section>
  );
}

/* ---------------- Vokabeln verwalten ---------------- */
export function Words({ profile, onLearnUnit }: { profile: Profile; onLearnUnit: (u: Unit) => void }) {
  const s = useStore((x) => x);
  const langs = langsOfProfile(s, profile.id);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const nq = normalize(q);
  const units = s.data.units
    .filter((u) => u.profile_id === profile.id && (filter === "all" || u.language_id === filter))
    .sort((a, b) => a.language_id.localeCompare(b.language_id) || a.name.localeCompare(b.name, "de", { numeric: true }));
  const cardsByUnit = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of s.data.cards) (m.get(c.unit_id) ?? m.set(c.unit_id, []).get(c.unit_id)!).push(c);
    for (const l of m.values()) l.sort((a, b) => a.position - b.position);
    return m;
  }, [s.data.cards]);

  return (
    <div className="grid">
      <div className="row">
        <Seg value={filter} options={[["all", "Alle"], ...langs.map((l) => [l.id, l.name] as [string, string])]} onChange={setFilter} />
        <span className="spacer" />
        <input type="text" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} aria-label="Vokabeln durchsuchen" />
      </div>
      {units.map((u) => {
        const cards = (cardsByUnit.get(u.id) ?? []).filter((c) => !nq || normalize(c.term + " " + c.translation).includes(nq));
        if (nq && !cards.length) return null;
        return <UnitBlock key={u.id} unit={u} cards={cards} profile={profile} open={!!nq} onLearn={() => onLearnUnit(u)} />;
      })}
      {!units.length && <div className="card muted">Noch keine Lektionen. Lege unter „Importieren“ eine an.</div>}
    </div>
  );
}

function UnitBlock({ unit, cards, profile, open, onLearn }: { unit: Unit; cards: Card[]; profile: Profile; open: boolean; onLearn: () => void }) {
  const s = useStore((x) => x);
  const lang = s.data.languages.find((l) => l.id === unit.language_id)!;
  const pm = new Map(s.data.progress.filter((p) => p.profile_id === profile.id).map((p) => [p.item_key, p]));
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState({ term: "", translation: "", info: "" });
  const [name, setName] = useState(unit.name);
  const [add, setAdd] = useState({ term: "", translation: "", info: "" });
  const due = cards.filter((c) => isDue(pm.get(cardKey(c)))).length;

  function saveEdit(c: Card) {
    upsert("cards", [{ ...c, term: draft.term.trim() || c.term, translation: draft.translation.trim() || c.translation, info: draft.info.trim() }]);
    setEdit(null);
  }
  function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!add.term.trim() || !add.translation.trim()) return;
    const pos = Math.max(0, ...getState().data.cards.filter((c) => c.unit_id === unit.id).map((c) => c.position)) + 1;
    upsert("cards", [{ id: newId(), unit_id: unit.id, term: add.term.trim(), translation: add.translation.trim(), info: add.info.trim(), position: pos }]);
    setAdd({ term: "", translation: "", info: "" });
  }
  function resetProgress() {
    const keys = new Set(cards.map(cardKey));
    remove("progress", getState().data.progress.filter((p) => p.profile_id === profile.id && keys.has(p.item_key)));
    toast("Lernstand zurückgesetzt");
  }

  return (
    <details className="unit" open={open || undefined}>
      <summary>
        <Tag short={lang.short} color={lang.color} /><b>{unit.name}</b><span className="spacer" />
        <span className="small muted">{cards.length} Vokabeln · {due} fällig</span>
      </summary>
      <div className="body">
        <div className="tbl"><table>
          <thead><tr><th>{lang.name}</th><th>Deutsch</th><th>{lang.info_label}</th><th>Fach</th><th></th></tr></thead>
          <tbody>
            {cards.map((c) => {
              const box = pm.get(cardKey(c))?.box ?? 0;
              return edit === c.id ? (
                <tr key={c.id}>
                  <td><input type="text" value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} aria-label={lang.name} autoFocus /></td>
                  <td><input type="text" value={draft.translation} onChange={(e) => setDraft({ ...draft, translation: e.target.value })} aria-label="Deutsch" /></td>
                  <td><input type="text" value={draft.info} onChange={(e) => setDraft({ ...draft, info: e.target.value })} aria-label={lang.info_label} /></td>
                  <td></td>
                  <td><span className="row" style={{ flexWrap: "nowrap" }}><button className="btn sm primary" onClick={() => saveEdit(c)}>OK</button><button className="btn sm ghost" onClick={() => setEdit(null)}>Abbrechen</button></span></td>
                </tr>
              ) : (
                <tr key={c.id}>
                  <td><b>{c.term}</b></td><td>{c.translation}</td><td className="small muted">{c.info}</td>
                  <td style={{ whiteSpace: "nowrap" }}><span className="dot" style={{ ["--b" as string]: BOX_COLORS[box] }} />{box || "neu"}</td>
                  <td><span className="row" style={{ flexWrap: "nowrap" }}>
                    <button className="btn sm ghost" onClick={() => { setEdit(c.id); setDraft({ term: c.term, translation: c.translation, info: c.info }); }}>Bearbeiten</button>
                    <button className="btn sm ghost" aria-label="Löschen" onClick={() => remove("cards", [c])}>✕</button>
                  </span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <form className="fields" onSubmit={addCard}>
          <label className="f">{lang.name}<input type="text" value={add.term} onChange={(e) => setAdd({ ...add, term: e.target.value })} required /></label>
          <label className="f">Deutsch<input type="text" value={add.translation} onChange={(e) => setAdd({ ...add, translation: e.target.value })} required placeholder="mehrere mit ; trennen" /></label>
          <label className="f">{lang.info_label}<input type="text" value={add.info} onChange={(e) => setAdd({ ...add, info: e.target.value })} /></label>
          <div className="row" style={{ alignSelf: "end" }}><button className="btn primary">Hinzufügen</button></div>
        </form>
        <div className="row">
          <button className="btn sm" onClick={onLearn}>Diese Lektion üben</button>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name der Lektion" style={{ maxWidth: 240 }} />
          {name.trim() && name !== unit.name && <button className="btn sm" onClick={() => upsert("units", [{ ...unit, name: name.trim() }])}>Umbenennen</button>}
          <span className="spacer" />
          <Confirm label="Lernstand zurücksetzen" confirmLabel="Ja, zurücksetzen" onConfirm={resetProgress} />
          <Confirm label="Lektion löschen" onConfirm={() => { remove("units", [unit]); toast("Lektion gelöscht"); }} />
        </div>
      </div>
    </details>
  );
}
