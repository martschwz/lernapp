// Gemeinsame Abfrage für Vokabeln und Mathe: Eintippen, Auswahl, Karteikarte oder Zahlenblock.
import { useEffect, useRef, useState } from "react";
import { checkAnswer, type CheckResult } from "../lib/check";
import { getState, overrideAnswer, recordAnswer, setBusy, type Progress } from "../lib/store";
import { BOX_COLORS, boxLabel } from "../lib/srs";
import { canSpeak, speak } from "../lib/speech";
import { SpeakerIcon, Tag } from "./ui";

export type QuizItem = {
  key: string | null; // Schlüssel im Karteikasten, null = nicht speichern
  prompt: string;
  answer: string;
  info?: string;
  showInfoInQuestion?: boolean;
  from: string;
  to: string;
  tag?: { short: string; color: string };
  context?: string;
  speakText?: string; // Fremdsprachiges Wort zum Vorlesen
  speakLang?: string | null;
  speakOnShow?: boolean; // Frage automatisch vorlesen (z. B. Diktat)
  speakInQuestion?: boolean; // Vorlese-Knopf schon bei der Frage zeigen
  chars?: string;
  lenient?: boolean;
  options?: string[]; // Auswahl-Modus
};
export type QuizMode = "type" | "mc" | "card" | "numpad";
export type QuizResult = { right: number; wrong: number; wrongItems: QuizItem[] };

export function Quiz({ items, mode, profileId, onDone, onQuit }: {
  items: QuizItem[]; mode: QuizMode; profileId: string;
  onDone: (r: QuizResult) => void; onQuit: (r: QuizResult) => void;
}) {
  const [i, setI] = useState(0);
  const [given, setGiven] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState<QuizResult>({ right: 0, wrong: 0, wrongItems: [] });
  const before = useRef<Progress | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const item = items[i];

  useEffect(() => { setBusy(true); return () => { setBusy(false); }; }, []);
  useEffect(() => {
    if (result) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [i, result]);
  useEffect(() => {
    if (item?.speakOnShow && item.speakText) speak(item.speakText, item.speakLang);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;
  const progress = getState().data.progress.find((p) => p.profile_id === profileId && p.item_key === item.key);
  const box = progress?.box ?? 0;

  function grade(g: string, res: CheckResult) {
    before.current = progress;
    setGiven(g);
    setResult(res);
    const ok = res !== "wrong";
    recordAnswer(profileId, item.key, ok);
    setScore((s) => ok ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1, wrongItems: [...s.wrongItems, item] });
  }
  function submit(g: string) {
    if (result) return;
    if (mode === "numpad") grade(g, g.trim() === item.answer ? "right" : "wrong");
    else grade(g, checkAnswer(g, item.answer, item.lenient));
  }
  function next(sc = score) {
    if (i + 1 >= items.length) { onDone(sc); return; }
    setI(i + 1); setGiven(""); setResult(null); setFlipped(false);
  }
  function override() {
    overrideAnswer(profileId, item.key, before.current);
    const sc = { right: score.right + 1, wrong: score.wrong - 1, wrongItems: score.wrongItems.slice(0, -1) };
    setScore(sc);
    next(sc);
  }
  function selfGrade(ok: boolean) {
    recordAnswer(profileId, item.key, ok);
    const sc = ok ? { ...score, right: score.right + 1 } : { ...score, wrong: score.wrong + 1, wrongItems: [...score.wrongItems, item] };
    setScore(sc);
    next(sc);
  }
  const insertChar = (c: string) => {
    const el = inputRef.current;
    if (!el) return setGiven((g) => g + c);
    const s = el.selectionStart ?? given.length, e = el.selectionEnd ?? given.length;
    const v = given.slice(0, s) + c + given.slice(e);
    setGiven(v);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + c.length, s + c.length); });
  };
  const speakBtn = item.speakText && canSpeak(item.speakLang)
    ? <button className="speak" type="button" aria-label="Vorlesen" onClick={() => speak(item.speakText!, item.speakLang)}><SpeakerIcon /></button>
    : null;

  return (
    <div className="quiz">
      <div className="row">
        <button className="btn ghost sm" onClick={() => onQuit(score)}>✕ Beenden</button>
        <span className="spacer" />
        <span className="small muted" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1} / {items.length} · ✓ {score.right} · ✗ {score.wrong}</span>
      </div>
      <div className="progress"><i style={{ width: `${(i / items.length) * 100}%` }} /></div>
      <div className="flash">
        {item.key && <span className="boxchip" style={{ ["--b" as string]: BOX_COLORS[box] }}>{boxLabel(box)}</span>}
        <span className="from">{item.tag && <Tag {...item.tag} />}{item.to ? `${item.from} → ${item.to}` : item.from}</span>
        <div className="q">{item.prompt}</div>
        {item.showInfoInQuestion && item.info && <div className="muted" style={{ fontWeight: 700 }}>{item.info}</div>}
        {(item.speakOnShow || item.speakInQuestion) && speakBtn}
        {item.context && <span className="small muted">{item.context}</span>}
      </div>

      {mode === "type" && !result && (
        <form className="grid" onSubmit={(e) => { e.preventDefault(); submit(given); }}>
          <input ref={inputRef} type="text" className="answer" value={given} onChange={(e) => setGiven(e.target.value)}
            autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={`${item.to} eingeben …`} aria-label={`Antwort auf ${item.to}`} />
          {item.chars && (
            <div className="charbar" aria-label="Sonderzeichen">
              {[...item.chars].map((c) => <button type="button" key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => insertChar(c)}>{c}</button>)}
            </div>
          )}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => submit("")}>Weiß ich nicht</button>
            <span className="spacer" />
            <button className="btn primary">Prüfen</button>
          </div>
        </form>
      )}

      {mode === "numpad" && !result && <Numpad value={given} onChange={setGiven} onSubmit={() => given && submit(given)} />}

      {mode === "mc" && (
        <div className="mc">
          {(item.options ?? []).map((o) => {
            const cls = result ? (o === item.answer ? "right" : o === given ? "wrong" : "") : "";
            return <button key={o} className={cls} disabled={!!result} onClick={() => grade(o, o === item.answer ? "right" : "wrong")}>{o}</button>;
          })}
        </div>
      )}

      {mode === "card" && (!flipped ? (
        <div className="row" style={{ justifyContent: "center" }}><button className="btn primary big" onClick={() => setFlipped(true)}>Karte umdrehen</button></div>
      ) : (
        <>
          <div className="feedback" style={{ background: "var(--surface-2)" }}>
            <span className="small muted">Lösung</span>
            <span className="row"><span className="sol">{item.answer}</span>{!item.speakInQuestion && speakBtn}</span>
            {item.info && <span className="small muted">{item.info}</span>}
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn bad big" onClick={() => selfGrade(false)}>Nicht gewusst</button>
            <button className="btn good big" onClick={() => selfGrade(true)}>Gewusst</button>
          </div>
        </>
      ))}

      {result && mode !== "card" && (
        <>
          <div className={`feedback ${result}`} role="status">
            <b>{result === "right" ? "Richtig!" : result === "typo" ? "Fast! Achte auf die Schreibweise." : result === "accent" ? "Fast! Achte auf die Sonderzeichen." : given ? "Leider falsch." : "Kein Problem, jetzt weißt du es."}</b>
            {mode !== "mc" && result !== "right" && given && <span className="small">Deine Antwort: {given}</span>}
            <span className="row"><span className="sol">{mode === "numpad" ? `${item.prompt} = ${item.answer}` : item.answer}</span>{!item.speakInQuestion && speakBtn}</span>
            {item.info && !item.showInfoInQuestion && <span className="small muted">{item.info}</span>}
          </div>
          <div className="row">
            {result === "wrong" && given && mode === "type" && <button className="btn ghost sm" onClick={override}>Ich hatte recht</button>}
            <span className="spacer" />
            <button ref={nextRef} className="btn primary big" onClick={() => next()}>Weiter</button>
          </div>
        </>
      )}
    </div>
  );
}

function Numpad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) onChange((value + e.key).slice(0, 6));
      else if (e.key === "Backspace") onChange(value.slice(0, -1));
      else if (e.key === "Enter") onSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange, onSubmit]);
  const press = (k: string) => onChange((value + k).slice(0, 6));
  return (
    <div className="grid">
      <div className="numdisplay" aria-live="polite">{value || <span className="muted">?</span>}</div>
      <div className="numpad">
        {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((k) => <button key={k} type="button" onClick={() => press(k)}>{k}</button>)}
        <button type="button" onClick={() => onChange(value.slice(0, -1))} aria-label="Löschen">⌫</button>
        <button type="button" onClick={() => press("0")}>0</button>
        <button type="button" className="ok" onClick={onSubmit} aria-label="Prüfen">✓</button>
      </div>
    </div>
  );
}

export function Summary({ result, onHome, onRetry }: { result: QuizResult; onHome: () => void; onRetry?: () => void }) {
  const total = result.right + result.wrong;
  const pct = total ? Math.round((result.right / total) * 100) : 0;
  return (
    <div className="quiz">
      <section className="card grid" style={{ textAlign: "center", justifyItems: "center" }}>
        <h2>{pct >= 90 ? "Hervorragend!" : pct >= 70 ? "Gut gemacht!" : "Dranbleiben lohnt sich!"}</h2>
        <div style={{ fontSize: "2rem" }} aria-label={`${Math.round(pct / 20)} von 5 Sternen`}>{"★".repeat(Math.round(pct / 20)) + "☆".repeat(5 - Math.round(pct / 20))}</div>
        <div className="stats" style={{ justifyContent: "center" }}>
          <div className="stat"><b>{result.right}</b><span>richtig</span></div>
          <div className="stat"><b>{result.wrong}</b><span>falsch</span></div>
          <div className="stat"><b>{pct}%</b><span>Trefferquote</span></div>
        </div>
        {result.wrongItems.length > 0 && (
          <div style={{ width: "100%", textAlign: "left" }}>
            <p className="small muted" style={{ fontWeight: 700 }}>Diese kommen bald wieder dran:</p>
            <div className="tbl"><table><tbody>
              {result.wrongItems.map((it, k) => <tr key={k}><td>{it.prompt}</td><td><b>{it.answer}</b></td></tr>)}
            </tbody></table></div>
          </div>
        )}
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={onHome}>Zur Übersicht</button>
          {onRetry && result.wrongItems.length > 0 && <button className="btn primary" onClick={onRetry}>Fehler nochmal üben</button>}
        </div>
      </section>
    </div>
  );
}
