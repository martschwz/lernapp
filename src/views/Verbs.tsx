// Trainer für unregelmäßige englische Verben (Karteikasten wie bei den Vokabeln).
import { useEffect, useRef, useState } from "react";
import { getState, recordAnswer, setBusy, useStore, type Profile } from "../lib/store";
import { progressMap, boxCounts } from "../lib/selectors";
import { BOX_COLORS, boxLabel, isDue, shuffle } from "../lib/srs";
import { checkForm, verbKey, VERBS, type Verb } from "../lib/verbs";
import { canSpeak, speak } from "../lib/speech";
import { Summary, type QuizItem, type QuizResult } from "../components/Quiz";
import { Kasten, Seg, SpeakerIcon, Tag, NumberField } from "../components/ui";

type Mode = "past" | "both" | "de";
type Field = "inf" | "past" | "part";
const LABEL: Record<Field, string> = { inf: "Infinitive (Grundform)", past: "simple past", part: "past participle" };
const FIELDS: Record<Mode, Field[]> = { past: ["past"], both: ["past", "part"], de: ["inf", "past", "part"] };
const shown = (s: string) => s.replace(/\//g, " / ");
const saying = (v: Verb) => [v.inf, v.past, v.part].map((s) => s.split("/")[0].replace(/\s*\(.*\)/, "")).join(", ");

export function VerbTrainer({ profile, onHome }: { profile: Profile; onHome: () => void }) {
  const s = useStore((x) => x);
  const kid = profile.grade > 0 && profile.grade <= 6;
  const [list, setList] = useState<"basic" | "all">(kid ? "basic" : "all");
  const [mode, setMode] = useState<Mode>(kid ? "past" : "both");
  const [size, setSize] = useState(10);
  const [items, setItems] = useState<Verb[] | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const pm = progressMap(s, profile.id);
  const pool = VERBS.filter((v) => list === "all" || v.basic);
  const due = pool.filter((v) => pm.has(verbKey(v)) && isDue(pm.get(verbKey(v)))).length;

  function start(verbs?: Verb[]) {
    let vs = verbs;
    if (!vs) {
      const d = pool.filter((v) => pm.has(verbKey(v)) && isDue(pm.get(verbKey(v))));
      const fresh = pool.filter((v) => !pm.has(verbKey(v)));
      const rest = pool.filter((v) => pm.has(verbKey(v)) && !isDue(pm.get(verbKey(v)))).sort((a, b) => pm.get(verbKey(a))!.box - pm.get(verbKey(b))!.box);
      vs = [...shuffle(d), ...shuffle(fresh), ...rest].slice(0, Math.max(3, Math.min(50, size)));
    }
    setResult(null);
    setItems(shuffle(vs));
  }

  if (result) return <Summary result={result} onHome={onHome} onRetry={() => start(VERBS.filter((v) => result.wrongItems.some((w) => w.key === verbKey(v))))} />;
  if (items) return <VerbQuiz verbs={items} mode={mode} profileId={profile.id} onEnd={(r) => { setItems(null); if (r.right + r.wrong) setResult(r); }} />;

  return (
    <div className="grid narrow">
      <section className="card grid">
        <div className="row"><Tag short="EN" color="#1f7a8c" /><h2>Unregelmäßige Verben</h2></div>
        <div className="grid" style={{ gap: 6 }}><span className="small muted" style={{ fontWeight: 700 }}>Welche Verben?</span>
          <Seg value={list} options={[["basic", `Grundliste (${VERBS.filter((v) => v.basic).length})`], ["all", `Alle (${VERBS.length})`]]} onChange={setList} />
        </div>
        <div className="grid" style={{ gap: 6 }}><span className="small muted" style={{ fontWeight: 700 }}>Was wird abgefragt?</span>
          <Seg value={mode} options={[["past", "simple past"], ["both", "simple past + past participle"], ["de", "Alle Formen vom Deutschen aus"]]} onChange={setMode} />
          <span className="small muted">{mode === "past" ? "Beispiel: go → went" : mode === "both" ? "Beispiel: go → went → gone" : "Beispiel: gehen → go → went → gone"}</span>
        </div>
        <div className="row">
          <NumberField label="Verben pro Runde" value={size} min={3} max={50} onChange={setSize} style={{ maxWidth: 160 }} />
          <span className="spacer" />
          <button className="btn primary big" onClick={() => start()}>Los geht's{due ? ` (${due} fällig)` : ""}</button>
        </div>
      </section>
      <section className="card grid">
        <h3>Dein Karteikasten</h3>
        <Kasten counts={boxCounts(pool.map((v) => pm.get(verbKey(v))))} />
        <details>
          <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>Liste ansehen</summary>
          <div className="tbl" style={{ marginTop: 10 }}><table>
            <thead><tr><th>Infinitive</th><th>simple past</th><th>past participle</th><th>Deutsch</th><th>Fach</th></tr></thead>
            <tbody>{pool.map((v) => {
              const box = pm.get(verbKey(v))?.box ?? 0;
              return <tr key={v.inf}><td><b>{v.inf}</b></td><td>{shown(v.past)}</td><td>{shown(v.part)}</td><td className="small">{v.de}</td>
                <td style={{ whiteSpace: "nowrap" }}><span className="dot" style={{ ["--b" as string]: BOX_COLORS[box] }} />{box || "neu"}</td></tr>;
            })}</tbody>
          </table></div>
        </details>
      </section>
    </div>
  );
}

function VerbQuiz({ verbs, mode, profileId, onEnd }: { verbs: Verb[]; mode: Mode; profileId: string; onEnd: (r: QuizResult) => void }) {
  const fields = FIELDS[mode];
  const [i, setI] = useState(0);
  const [vals, setVals] = useState<Record<Field, string>>({ inf: "", past: "", part: "" });
  const [res, setRes] = useState<Record<Field, boolean> | null>(null);
  const [score, setScore] = useState<QuizResult>({ right: 0, wrong: 0, wrongItems: [] });
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const nextRef = useRef<HTMLButtonElement>(null);
  const v = verbs[i];

  useEffect(() => { setBusy(true); return () => { setBusy(false); }; }, []);
  useEffect(() => { if (res) nextRef.current?.focus(); else refs.current[fields[0]]?.focus(); }, [i, res]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!v) return null;
  const key = verbKey(v);
  const box = getState().data.progress.find((p) => p.profile_id === profileId && p.item_key === key)?.box ?? 0;
  const expected: Record<Field, string> = { inf: v.inf, past: v.past, part: v.part };

  function submit() {
    const r = Object.fromEntries(fields.map((f) => [f, f === "inf" ? checkForm(vals.inf, v.inf) : checkForm(vals[f], expected[f])])) as Record<Field, boolean>;
    const ok = fields.every((f) => r[f]);
    recordAnswer(profileId, key, ok);
    setRes(r);
    const item: QuizItem = { key, prompt: mode === "de" ? v.de : v.inf, answer: fields.map((f) => shown(expected[f])).join(" – "), from: "", to: "" };
    setScore((s) => (ok ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1, wrongItems: [...s.wrongItems, item] }));
  }
  function next() {
    if (i + 1 >= verbs.length) return onEnd(score);
    setI(i + 1); setVals({ inf: "", past: "", part: "" }); setRes(null);
  }
  const allOk = res && fields.every((f) => res[f]);

  return (
    <div className="quiz">
      <div className="row">
        <button className="btn ghost sm" onClick={() => onEnd(score)}>✕ Beenden</button>
        <span className="spacer" />
        <span className="small muted" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1} / {verbs.length} · ✓ {score.right} · ✗ {score.wrong}</span>
      </div>
      <div className="progress"><i style={{ width: `${(i / verbs.length) * 100}%` }} /></div>
      <div className="flash">
        <span className="boxchip" style={{ ["--b" as string]: BOX_COLORS[box] }}>{boxLabel(box)}</span>
        <span className="from">Unregelmäßige Verben</span>
        <div className="q">{mode === "de" ? v.de : v.inf}</div>
        {mode !== "de" && <div className="muted" style={{ fontWeight: 700 }}>{v.de}</div>}
      </div>
      <form className="grid" onSubmit={(e) => { e.preventDefault(); if (!res) submit(); else next(); }}>
        {fields.map((f, k) => (
          <label className="f" key={f}>
            <span className="row" style={{ gap: 6 }}>{LABEL[f]}{res && <span style={{ color: res[f] ? "var(--good)" : "var(--bad)" }}>{res[f] ? "✓ richtig" : `✗ richtig ist: ${shown(expected[f])}`}</span>}</span>
            <input ref={(el) => { refs.current[f] = el; }} type="text" className="answer" value={vals[f]} readOnly={!!res}
              autoComplete="off" autoCapitalize="off" spellCheck={false}
              style={res ? { borderColor: res[f] ? "var(--good)" : "var(--bad)" } : undefined}
              onChange={(e) => setVals({ ...vals, [f]: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter" && !res && k < fields.length - 1) { e.preventDefault(); refs.current[fields[k + 1]]?.focus(); } }} />
          </label>
        ))}
        {res ? (
          <>
            <div className={`feedback ${allOk ? "right" : "wrong"}`} role="status">
              <b>{allOk ? "Richtig!" : "Nicht ganz."}</b>
              <span className="row"><span className="sol">{shown(v.inf)} – {shown(v.past)} – {shown(v.part)}</span>
                {canSpeak("en-GB") && <button type="button" className="speak" aria-label="Vorlesen" onClick={() => speak(saying(v), "en-GB", 0.8)}><SpeakerIcon /></button>}
              </span>
              <span className="small muted">{v.de}</span>
            </div>
            <div className="row"><span className="spacer" /><button ref={nextRef} className="btn primary big">Weiter</button></div>
          </>
        ) : (
          <div className="row">
            <button type="button" className="btn ghost" onClick={submit}>Weiß ich nicht</button>
            <span className="spacer" />
            <button className="btn primary">Prüfen</button>
          </div>
        )}
      </form>
    </div>
  );
}

/** Für die Startseite: Stand der Verben. */
export function verbStats(profileId: string) {
  const pm = progressMap(getState(), profileId);
  const started = VERBS.filter((v) => pm.has(verbKey(v)));
  return { started: started.length, due: started.filter((v) => isDue(pm.get(verbKey(v)))).length };
}
