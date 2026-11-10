import { useEffect, useState, useSyncExternalStore } from "react";
import { getPinRequest, setParentPin, subscribePin } from "../lib/pin";
import { getState } from "../lib/store";
import { supabase } from "../lib/supabase";

export function PinModal() {
  const req = useSyncExternalStore(subscribePin, getPinRequest);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const [reset, setReset] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { setPin(""); setWrong(false); setReset(false); setPw(""); setMsg(""); }, [req]);

  async function enter(p: string) {
    if (!req) return;
    if (await req.check(p)) req.resolve(true);
    else { setWrong(true); setPin(""); }
  }
  const press = (d: string) => {
    if (pin.length >= 4) return;
    const p = pin + d;
    setPin(p); setWrong(false);
    if (p.length === 4) enter(p);
  };

  useEffect(() => {
    if (!req || reset) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((x) => x.slice(0, -1));
      else if (e.key === "Escape") req.resolve(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function resetWithPassword(e: React.FormEvent) {
    e.preventDefault();
    const email = getState().session?.user.email;
    if (!email || !req) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) { setMsg("Das Passwort stimmt nicht."); return; }
    await setParentPin(null);
    req.resolve(true);
  }

  if (!req) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={req.title}>
      <div className="card grid pinbox">
        <h2 style={{ textAlign: "center" }}>{req.title}</h2>
        {req.hint && <p className="small muted" style={{ margin: 0, textAlign: "center" }}>{req.hint}</p>}
        {!reset ? (
          <>
            <div className={`pindots ${wrong ? "shake" : ""}`} aria-live="polite" aria-label={`${pin.length} von 4 Ziffern`}>
              {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
            </div>
            {wrong && <p className="small" style={{ color: "var(--bad)", margin: 0, textAlign: "center" }}>Falsche PIN. Bitte nochmal.</p>}
            <div className="numpad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} type="button" onClick={() => press(k)}>{k}</button>)}
              <button type="button" onClick={() => req.resolve(false)} aria-label="Abbrechen" style={{ fontSize: "1rem" }}>Abbrechen</button>
              <button type="button" onClick={() => press("0")}>0</button>
              <button type="button" onClick={() => setPin((x) => x.slice(0, -1))} aria-label="Löschen">⌫</button>
            </div>
            {req.allowReset && <button className="btn ghost sm" onClick={() => setReset(true)}>PIN vergessen?</button>}
          </>
        ) : (
          <form className="grid" onSubmit={resetWithPassword}>
            <p className="small" style={{ margin: 0 }}>Gib das Passwort des Familienkontos ein. Danach kannst du eine neue Eltern-PIN festlegen.</p>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Passwort" aria-label="Passwort" autoFocus autoComplete="current-password" />
            {msg && <div className="notice err">{msg}</div>}
            <div className="row"><button type="button" className="btn ghost" onClick={() => setReset(false)}>Zurück</button><span className="spacer" /><button className="btn primary">Bestätigen</button></div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Neue PIN zweimal eingeben. */
export function PinSetup({ title, onDone, onCancel }: { title: string; onDone: (pin: string) => void; onCancel?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const press = (d: string) => {
    if (pin.length >= 4) return;
    const p = pin + d;
    setPin(p); setErr("");
    if (p.length < 4) return;
    if (first === null) { setFirst(p); setPin(""); }
    else if (p === first) onDone(p);
    else { setErr("Die beiden PINs sind verschieden. Bitte nochmal von vorn."); setFirst(null); setPin(""); }
  };
  return (
    <div className="grid pinbox" style={{ margin: "0 auto" }}>
      <h3 style={{ textAlign: "center" }}>{title}</h3>
      <p className="small muted" style={{ margin: 0, textAlign: "center" }}>{first === null ? "4 Ziffern eingeben" : "Zur Sicherheit nochmal eingeben"}</p>
      <div className="pindots">{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}</div>
      {err && <p className="small" style={{ color: "var(--bad)", margin: 0, textAlign: "center" }}>{err}</p>}
      <div className="numpad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} type="button" onClick={() => press(k)}>{k}</button>)}
        {onCancel ? <button type="button" onClick={onCancel} style={{ fontSize: "1rem" }}>Abbrechen</button> : <span />}
        <button type="button" onClick={() => press("0")}>0</button>
        <button type="button" onClick={() => setPin((x) => x.slice(0, -1))} aria-label="Löschen">⌫</button>
      </div>
    </div>
  );
}
