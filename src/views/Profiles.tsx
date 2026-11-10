import { useState } from "react";
import { newId, remove, setActiveProfile, upsert, useStore, type Profile } from "../lib/store";
import { Confirm, toast } from "../components/ui";

export const AVATARS = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐙", "🦄", "🐬", "🦉", "🐢", "🚀", "⚽", "🌻", "🎸", "🐱", "🐶"];
export const GRADES: [number, string][] = [[0, "Erwachsen"], ...Array.from({ length: 13 }, (_, i) => [i + 1, `Klasse ${i + 1}`] as [number, string])];

export function ProfilePicker({ onPicked }: { onPicked?: () => void }) {
  const profiles = useStore((s) => s.data.profiles);
  const [adding, setAdding] = useState(profiles.length === 0);
  const sorted = [...profiles].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return (
    <div className="grid narrow">
      <h2 style={{ textAlign: "center" }}>{profiles.length ? "Wer lernt jetzt?" : "Willkommen! Lege das erste Profil an."}</h2>
      {profiles.length > 0 && (
        <div className="pick">
          {sorted.map((p) => (
            <button key={p.id} onClick={() => { setActiveProfile(p.id); onPicked?.(); }}>
              <span className="avatar">{p.avatar}</span>{p.name}
              <span className="small muted">{p.grade ? `Klasse ${p.grade}` : "Erwachsen"}</span>
            </button>
          ))}
        </div>
      )}
      {adding ? <ProfileForm onSaved={(p) => { setAdding(false); if (!profiles.length) setActiveProfile(p.id); }} onCancel={profiles.length ? () => setAdding(false) : undefined} />
        : <div className="row" style={{ justifyContent: "center" }}><button className="btn" onClick={() => setAdding(true)}>+ Profil hinzufügen</button></div>}
    </div>
  );
}

export function ProfileForm({ profile, onSaved, onCancel }: { profile?: Profile; onSaved?: (p: Profile) => void; onCancel?: () => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [grade, setGrade] = useState(profile?.grade ?? 6);
  const [goal, setGoal] = useState(profile?.daily_goal ?? 20);
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects ?? ["lang", "math"]);
  const toggle = (s: string) => setSubjects((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p: Profile = { ...(profile ?? { id: newId(), created_at: new Date().toISOString() }), name: name.trim(), avatar, grade, daily_goal: goal, subjects };
    upsert("profiles", [p]);
    toast(profile ? "Gespeichert" : `Profil „${p.name}“ angelegt`);
    onSaved?.(p);
  }
  return (
    <form className="card grid" onSubmit={save}>
      <h3>{profile ? `${profile.name} bearbeiten` : "Neues Profil"}</h3>
      <div className="fields">
        <label className="f">Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="f">Klassenstufe
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{GRADES.map(([g, l]) => <option key={g} value={g}>{l}</option>)}</select>
        </label>
        <label className="f">Tagesziel (Abfragen)<input type="number" min={5} max={300} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 20)} /></label>
      </div>
      <div className="grid" style={{ gap: 6 }}>
        <span className="small muted" style={{ fontWeight: 700 }}>Bild</span>
        <div className="emoji-pick">{AVATARS.map((a) => <button type="button" key={a} aria-pressed={a === avatar} onClick={() => setAvatar(a)}>{a}</button>)}</div>
      </div>
      <div className="row">
        <span className="small muted" style={{ fontWeight: 700 }}>Fächer:</span>
        <label className="row small"><input type="checkbox" checked={subjects.includes("lang")} onChange={() => toggle("lang")} /> Sprachen</label>
        <label className="row small"><input type="checkbox" checked={subjects.includes("math")} onChange={() => toggle("math")} /> Mathe</label>
      </div>
      <div className="row">
        {profile && <Confirm label="Profil löschen" confirmLabel="Profil und Lernstand löschen" onConfirm={() => { remove("profiles", [profile]); toast("Profil gelöscht"); onSaved?.(profile); }} />}
        <span className="spacer" />
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Abbrechen</button>}
        <button className="btn primary">Speichern</button>
      </div>
    </form>
  );
}
