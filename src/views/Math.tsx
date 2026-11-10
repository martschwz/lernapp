import { useState } from "react";
import { useStore, type Profile } from "../lib/store";
import { progressMap } from "../lib/selectors";
import { BOX_COLORS, isDue, shuffle } from "../lib/srs";
import { allKeys, CORE_ROWS, itemFromKey, plusMinusItem, ROWS, TOPICS, type MathTopic } from "../lib/math";
import { Quiz, Summary, type QuizItem, type QuizResult } from "../components/Quiz";
import { Kasten, Seg } from "../components/ui";
import { boxCounts } from "../lib/selectors";

export function MathTrainer({ profile, onHome }: { profile: Profile; onHome: () => void }) {
  const s = useStore((x) => x);
  const kid = profile.grade > 0 && profile.grade <= 4;
  const topics = TOPICS.filter((t) => profile.grade === 0 || profile.grade >= t.minGrade);
  const [topic, setTopic] = useState<MathTopic>(topics[0]?.id ?? "mul");
  const [rows, setRows] = useState<number[]>(ROWS);
  const [size, setSize] = useState(kid ? 10 : 20);
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const pm = progressMap(s, profile.id);
  const t = TOPICS.find((x) => x.id === topic)!;
  const hasRows = topic === "mul" || topic === "div";

  function start(keys?: string[]) {
    let list: QuizItem[];
    if (topic === "plusminus" && !keys) {
      list = Array.from({ length: size }, () => toQuiz(plusMinusItem(profile.grade > 0 && profile.grade <= 2 ? 1 : 2)));
    } else {
      let ks = keys ?? allKeys(topic, hasRows ? rows : undefined);
      if (!keys) {
        // Fällige zuerst, dann neue, dann die schwächsten
        const due = ks.filter((k) => pm.has(k) && isDue(pm.get(k)));
        const fresh = ks.filter((k) => !pm.has(k));
        const rest = ks.filter((k) => pm.has(k) && !isDue(pm.get(k))).sort((a, b) => pm.get(a)!.box - pm.get(b)!.box);
        ks = [...shuffle(due), ...shuffle(fresh), ...rest].slice(0, size);
      }
      list = shuffle(ks).map((k) => toQuiz(itemFromKey(k)));
    }
    setResult(null);
    setItems(list);
  }
  const toQuiz = (m: ReturnType<typeof itemFromKey>): QuizItem => ({
    key: m.tracked ? m.key : null, prompt: m.prompt, answer: String(m.answer), from: t.name, to: "",
  });

  if (result) return <Summary result={result} onHome={onHome} onRetry={topic === "plusminus" ? undefined : () => start(result.wrongItems.map((w) => w.key!).filter(Boolean))} />;
  if (items) return <Quiz items={items} mode="numpad" profileId={profile.id} onDone={(r) => { setItems(null); setResult(r); }} onQuit={(r) => { setItems(null); if (r.right + r.wrong) setResult(r); }} />;

  const keys = topic === "plusminus" ? [] : allKeys(topic, hasRows ? rows : undefined);
  const dueN = keys.filter((k) => pm.has(k) && isDue(pm.get(k))).length;
  return (
    <div className="grid narrow">
      <section className="card grid">
        <h2>Mathe üben</h2>
        <Seg value={topic} options={topics.map((x) => [x.id, x.name])} onChange={(v) => setTopic(v)} />
        <p className="small muted" style={{ margin: 0 }}>{t.hint}</p>
        {hasRows && (
          <div className="grid" style={{ gap: 6 }}>
            <div className="row"><span className="small muted" style={{ fontWeight: 700 }}>Welche Reihen?</span>
              <button className="btn sm ghost" onClick={() => setRows(CORE_ROWS)}>Kernaufgaben (1, 2, 5, 10)</button>
              <button className="btn sm ghost" onClick={() => setRows(ROWS)}>Alle</button></div>
            <div className="seg">{ROWS.map((r) => (
              <button key={r} aria-pressed={rows.includes(r)} onClick={() => setRows((x) => (x.includes(r) ? (x.length > 1 ? x.filter((y) => y !== r) : x) : [...x, r].sort((a, b) => a - b)))}>{r}er</button>
            ))}</div>
          </div>
        )}
        <div className="row">
          <label className="f" style={{ maxWidth: 160 }}>Aufgaben pro Runde<input type="number" min={5} max={50} value={size} onChange={(e) => setSize(Number(e.target.value) || 10)} /></label>
          <span className="spacer" />
          <button className="btn primary big" onClick={() => start()}>Los geht's{dueN ? ` (${dueN} fällig)` : ""}</button>
        </div>
      </section>
      {topic !== "plusminus" && (
        <section className="card grid">
          <h3>Dein Karteikasten: {t.name}</h3>
          <Kasten counts={boxCounts(allKeys(topic).map((k) => pm.get(k)))} />
          {(topic === "mul" || topic === "div") && <Tafel topic={topic} pm={pm} />}
        </section>
      )}
    </div>
  );
}

/** 1×1-Tafel: jede Aufgabe ein Kästchen, Farbe = Fach im Karteikasten. */
function Tafel({ topic, pm }: { topic: "mul" | "div"; pm: ReturnType<typeof progressMap> }) {
  return (
    <div className="grid" style={{ gap: 6 }}>
      <span className="small muted">Jedes Kästchen ist eine Aufgabe. Grau = noch nicht geübt, Rot → Blau = immer sicherer.</span>
      <div className="tafel" role="img" aria-label={`Übersicht ${topic === "mul" ? "1×1" : "Geteilt"}`}>
        <span className="h">·</span>
        {ROWS.map((b) => <span className="h" key={b}>{b}</span>)}
        {ROWS.map((r) => (
          <FragmentRow key={r} r={r} topic={topic} pm={pm} />
        ))}
      </div>
    </div>
  );
}
function FragmentRow({ r, topic, pm }: { r: number; topic: string; pm: ReturnType<typeof progressMap> }) {
  return (
    <>
      <span className="h">{r}er</span>
      {ROWS.map((b) => {
        const p = pm.get(`${topic}:${r}:${b}`);
        return <span key={b} className={`c ${p ? "" : "new"}`} style={{ ["--b" as string]: BOX_COLORS[p?.box ?? 0] }} title={`${b} · ${r}`}>{p ? p.box : ""}</span>;
      })}
    </>
  );
}
