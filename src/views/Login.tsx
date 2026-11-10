import { useState } from "react";
import { supabase } from "../lib/supabase";

export function Login() {
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const redirect = window.location.origin + import.meta.env.BASE_URL;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setMsg({ text: "Fast geschafft: Wir haben dir eine E-Mail geschickt. Klicke auf den Link darin, dann kannst du dich anmelden." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (error) throw error;
        setMsg({ text: "Wir haben dir eine E-Mail zum Zurücksetzen des Passworts geschickt." });
      }
    } catch (err) {
      const m = (err as Error).message || "";
      setMsg({
        err: true,
        text: /invalid login/i.test(m) ? "E-Mail oder Passwort stimmt nicht."
          : /not confirmed/i.test(m) ? "Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail)."
          : /at least 6/i.test(m) ? "Das Passwort muss mindestens 6 Zeichen haben."
          : /already registered/i.test(m) ? "Für diese E-Mail gibt es schon ein Konto. Bitte anmelden."
          : "Das hat nicht geklappt: " + m,
      });
    } finally { setBusy(false); }
  }

  return (
    <main className="wrap">
      <section className="card grid narrow" style={{ maxWidth: 440, marginTop: "8vh" }}>
        <div className="row"><img src={import.meta.env.BASE_URL + "icon.svg"} alt="" width={44} height={44} style={{ borderRadius: 10 }} /><h1>Lernapp</h1></div>
        <p className="muted" style={{ margin: 0 }}>
          {mode === "up" ? "Ein Konto für die ganze Familie. Die Kinder bekommen danach eigene Profile." : mode === "reset" ? "Gib deine E-Mail-Adresse ein." : "Melde dich mit dem Familienkonto an."}
        </p>
        <form className="grid" onSubmit={submit}>
          <label className="f">E-Mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {mode !== "reset" && <label className="f">Passwort<input type="password" required minLength={6} autoComplete={mode === "up" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} /></label>}
          <button className="btn primary big" disabled={busy}>{mode === "in" ? "Anmelden" : mode === "up" ? "Konto anlegen" : "Link schicken"}</button>
        </form>
        {msg && <div className={`notice ${msg.err ? "err" : "ok"}`} role="status">{msg.text}</div>}
        <div className="row small">
          {mode !== "in" && <button className="btn ghost sm" onClick={() => setMode("in")}>Zur Anmeldung</button>}
          {mode !== "up" && <button className="btn ghost sm" onClick={() => setMode("up")}>Neues Familienkonto</button>}
          {mode !== "reset" && <button className="btn ghost sm" onClick={() => setMode("reset")}>Passwort vergessen?</button>}
        </div>
      </section>
    </main>
  );
}
