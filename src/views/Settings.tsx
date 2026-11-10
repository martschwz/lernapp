import { useEffect, useState } from "react";
import { getState, newId, remove, upsert, useStore, type Language, type Profile } from "../lib/store";
import { supabase } from "../lib/supabase";
import { dayKey, streak } from "../lib/srs";
import { TTS_OPTIONS } from "../lib/speech";
import { Confirm, Seg, Tag, toast } from "../components/ui";
import { ProfileForm } from "./Profiles";
import { ensureParent, isParentUnlocked, parentPinHash, setParentPin, unlockParent } from "../lib/pin";
import { PinSetup } from "../components/PinModal";

type Tab = "family" | "profiles" | "languages" | "account";

export function Settings() {
  const [tab, setTab] = useState<Tab>("family");
  const schemaOutdated = useStore((s) => s.schemaOutdated);
  const hasPin = useStore(() => !!parentPinHash());
  const [unlocked, setUnlocked] = useState(isParentUnlocked());

  useEffect(() => {
    if (!unlocked && hasPin) ensureParent().then(setUnlocked);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaOutdated && !hasPin) {
    return (
      <section className="card grid narrow">
        <h2>Eltern-PIN festlegen</h2>
        <p className="muted" style={{ margin: 0 }}>Mit der Eltern-PIN schützt du diesen Bereich: Profile, Sprachen, Abmelden sowie das Löschen von Lektionen. Die Kinder lernen ganz normal weiter.</p>
        <PinSetup title="Neue Eltern-PIN" onDone={async (pin) => { await setParentPin(pin); unlockParent(); setUnlocked(true); toast("Eltern-PIN gespeichert"); }} />
      </section>
    );
  }
  if (hasPin && !unlocked) {
    return (
      <section className="card grid narrow" style={{ justifyItems: "center", textAlign: "center" }}>
        <h2>🔒 Elternbereich</h2>
        <p className="muted" style={{ margin: 0 }}>Dieser Bereich ist mit der Eltern-PIN geschützt.</p>
        <button className="btn primary" onClick={() => ensureParent().then(setUnlocked)}>PIN eingeben</button>
      </section>
    );
  }
  return (
    <div className="grid narrow">
      {schemaOutdated && (
        <div className="notice err">
          Für die PINs fehlt noch ein Datenbank-Update: Öffne in Supabase den SQL Editor, füge den Inhalt von
          {" "}<code>supabase/migrations/0002_pins.sql</code> ein und klicke auf „Run“. Danach die App neu laden.
        </div>
      )}
      <Seg value={tab} options={[["family", "Übersicht"], ["profiles", "Profile"], ["languages", "Sprachen"], ["account", "Konto"]]} onChange={setTab} />
      {tab === "family" && <Family />}
      {tab === "profiles" && <ProfilesAdmin />}
      {tab === "languages" && <Languages />}
      {tab === "account" && <Account />}
    </div>
  );
}

function Family() {
  const s = useStore((x) => x);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return (
    <>
      {s.data.profiles.map((p) => {
        const acts = s.data.activity.filter((a) => a.profile_id === p.id);
        const byDay = new Map(acts.map((a) => [a.day, a]));
        const week = days.map((d) => byDay.get(dayKey(d)));
        const max = Math.max(1, ...week.map((a) => a?.answers ?? 0));
        const weekAnswers = week.reduce((n, a) => n + (a?.answers ?? 0), 0);
        const weekCorrect = week.reduce((n, a) => n + (a?.correct ?? 0), 0);
        const prog = s.data.progress.filter((x) => x.profile_id === p.id);
        const weak = [...prog].filter((x) => x.wrong_count >= 2).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5);
        return (
          <section className="card grid" key={p.id}>
            <div className="row"><span className="avatar">{p.avatar}</span><h3>{p.name}</h3><span className="spacer" />
              <span className="chip">{((n) => (n === 1 ? "1 Tag" : `${n} Tage`))(streak(new Set(acts.filter((a) => a.answers > 0).map((a) => a.day))))} am Stück</span></div>
            <div className="bars7" aria-label="Abfragen der letzten 7 Tage">
              {week.map((a, i) => <div key={i}><span className="small" style={{ fontSize: ".7rem" }}>{a?.answers ?? 0}</span><i style={{ height: `${((a?.answers ?? 0) / max) * 70}%` }} /><span>{wd[days[i].getDay()]}</span></div>)}
            </div>
            <div className="small muted">Diese Woche: {weekAnswers} Abfragen, {weekAnswers ? Math.round((weekCorrect / weekAnswers) * 100) : 0} % richtig · {prog.filter((x) => x.box >= 5).length} Aufgaben sitzen sicher</div>
            {weak.length > 0 && <div className="small">Fällt schwer: {weak.map((w) => label(w.item_key)).join(", ")}</div>}
          </section>
        );
      })}
    </>
  );
}
function label(key: string): string {
  const [t, a, b] = key.split(":");
  if (t === "card") { const c = getState().data.cards.find((x) => x.id === a); return c ? c.term : "?"; }
  if (t === "mul") return `${b}·${a}`;
  if (t === "div") return `${Number(a) * Number(b)}:${a}`;
  if (t === "big") return `${a}·${b}`;
  if (t === "sq") return `${a}²`;
  return key;
}

function ProfilesAdmin() {
  const profiles = useStore((s) => s.data.profiles);
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <>
      {profiles.map((p: Profile) => edit === p.id
        ? <ProfileForm key={p.id} profile={p} onSaved={() => setEdit(null)} onCancel={() => setEdit(null)} />
        : (
          <section className="card row" key={p.id}>
            <span className="avatar">{p.avatar}</span><b>{p.name}</b><span className="small muted">{p.grade ? `Klasse ${p.grade}` : "Erwachsen"}</span>
            <span className="spacer" /><button className="btn sm" onClick={() => setEdit(p.id)}>Bearbeiten</button>
          </section>
        ))}
      {adding ? <ProfileForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} /> : <div><button className="btn" onClick={() => setAdding(true)}>+ Profil hinzufügen</button></div>}
    </>
  );
}

function Languages() {
  const langs = useStore((s) => s.data.languages);
  const [edit, setEdit] = useState<string | null>(null);
  const blank: Language = { id: "", name: "", short: "", tts: null, chars: "", info_label: "Hinweis", lenient: false, color: "#5b6782", default_dir: "de" };
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>Sprachen gelten für die ganze Familie. Sonderzeichen erscheinen beim Eintippen als Tasten.</p>
      {[...langs].sort((a, b) => a.name.localeCompare(b.name, "de")).map((l) => edit === l.id
        ? <LangForm key={l.id} lang={l} onDone={() => setEdit(null)} />
        : (
          <section className="card row" key={l.id}>
            <Tag short={l.short} color={l.color} /><b>{l.name}</b>
            <span className="small muted">{l.tts ? "mit Stimme" : "ohne Stimme"}{l.chars ? ` · ${l.chars}` : ""}</span>
            <span className="spacer" /><button className="btn sm" onClick={() => setEdit(l.id)}>Bearbeiten</button>
          </section>
        ))}
      {edit === "new" ? <LangForm lang={blank} onDone={() => setEdit(null)} /> : <div><button className="btn" onClick={() => setEdit("new")}>+ Sprache hinzufügen</button></div>}
    </>
  );
}

function LangForm({ lang, onDone }: { lang: Language; onDone: () => void }) {
  const [v, setV] = useState<Language>(lang);
  const f = <K extends keyof Language>(k: K, val: Language[K]) => setV({ ...v, [k]: val });
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return;
    upsert("languages", [{ ...v, id: v.id || newId(), name: v.name.trim(), short: (v.short.trim() || v.name.slice(0, 2)).toUpperCase().slice(0, 3), tts: v.tts || null }]);
    toast("Gespeichert");
    onDone();
  }
  const used = useStore((s) => s.data.units.filter((u) => u.language_id === lang.id).length);
  return (
    <form className="card grid" onSubmit={save}>
      <div className="fields">
        <label className="f">Name<input type="text" value={v.name} onChange={(e) => f("name", e.target.value)} required /></label>
        <label className="f">Kürzel<input type="text" value={v.short} maxLength={3} onChange={(e) => f("short", e.target.value)} /></label>
        <label className="f">Farbe<input type="color" value={v.color} onChange={(e) => f("color", e.target.value)} style={{ height: 44, width: "100%" }} /></label>
        <label className="f">Vorlesen<select value={v.tts ?? ""} onChange={(e) => f("tts", e.target.value || null)}>{TTS_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}</select></label>
        <label className="f">Sonderzeichen-Tasten<input type="text" value={v.chars} onChange={(e) => f("chars", e.target.value.replace(/\s/g, ""))} placeholder="z. B. ąćęłńóśźż" /></label>
        <label className="f">Name der Zusatzspalte<input type="text" value={v.info_label} onChange={(e) => f("info_label", e.target.value)} /></label>
        <label className="f">Empfohlene Richtung<select value={v.default_dir} onChange={(e) => f("default_dir", e.target.value as "de" | "fs")}><option value="de">Deutsch → {v.name || "Fremdsprache"}</option><option value="fs">{v.name || "Fremdsprache"} → Deutsch</option></select></label>
      </div>
      <label className="row small"><input type="checkbox" checked={v.lenient} onChange={(e) => f("lenient", e.target.checked)} /> Großzügige Prüfung der Schreibweise (z. B. für Sprachen ohne feste Rechtschreibung)</label>
      <div className="row">
        {lang.id && <Confirm label="Sprache löschen" confirmLabel={used ? `Mit ${used} Lektionen löschen` : "Ja, löschen"} onConfirm={() => { remove("languages", [lang]); onDone(); }} />}
        <span className="spacer" /><button type="button" className="btn ghost" onClick={onDone}>Abbrechen</button><button className="btn primary">Speichern</button>
      </div>
    </form>
  );
}

function Account() {
  const email = useStore((s) => s.session?.user.email);
  const pending = useStore((s) => s.pending);
  const [pw, setPw] = useState("");
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    toast(error ? "Das Passwort konnte nicht geändert werden (mindestens 6 Zeichen)." : "Passwort geändert");
    if (!error) setPw("");
  }
  return (
    <section className="card grid">
      <div>Angemeldet als <b>{email}</b></div>
      {pending > 0 && <div className="notice">{pending} Änderungen warten noch auf Internet und werden automatisch übertragen.</div>}
      <form className="row" onSubmit={changePw}>
        <input type="password" placeholder="Neues Passwort" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 260 }} aria-label="Neues Passwort" autoComplete="new-password" />
        <button className="btn" disabled={pw.length < 6}>Passwort ändern</button>
      </form>
      <ParentPinChange />
      <div><button className="btn" onClick={() => supabase.auth.signOut()} disabled={pending > 0} title={pending ? "Erst abmelden, wenn alles übertragen ist" : ""}>Abmelden</button></div>
    </section>
  );
}

function ParentPinChange() {
  const schemaOutdated = useStore((s) => s.schemaOutdated);
  const [open, setOpen] = useState(false);
  if (schemaOutdated) return null;
  if (!open) return <div><button className="btn" onClick={() => setOpen(true)}>Eltern-PIN ändern</button></div>;
  return <PinSetup title="Neue Eltern-PIN" onCancel={() => setOpen(false)} onDone={async (pin) => { await setParentPin(pin); setOpen(false); toast("Eltern-PIN geändert"); }} />;
}
