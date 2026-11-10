import { useStore, type Profile } from "../lib/store";
import { boxCounts, cardsOf, dueCount, langsOfProfile, progressMap } from "../lib/selectors";
import { dayKey, isDue, streak } from "../lib/srs";
import { allKeys, TOPICS } from "../lib/math";
import { Kasten, Tag } from "../components/ui";
import type { View } from "../App";

export function Home({ profile, go }: { profile: Profile; go: (v: View, opts?: { languageId?: string }) => void }) {
  const s = useStore((x) => x);
  const acts = s.data.activity.filter((a) => a.profile_id === profile.id && a.answers > 0);
  const today = acts.find((a) => a.day === dayKey())?.answers ?? 0;
  const st = streak(new Set(acts.map((a) => a.day)));
  const langs = profile.subjects.includes("lang") ? langsOfProfile(s, profile.id) : [];
  const allCards = cardsOf(s, profile.id);
  const vocabDue = dueCount(allCards.map((c) => c.p));
  const pm = progressMap(s, profile.id);
  const mathTopics = profile.subjects.includes("math") ? TOPICS.filter((t) => t.id !== "plusminus" && (profile.grade === 0 || profile.grade >= t.minGrade)) : [];
  const mathStarted = mathTopics.map((t) => ({ t, keys: allKeys(t.id) })).filter((x) => x.keys.some((k) => pm.has(k)));
  const mathDue = mathStarted.reduce((n, x) => n + x.keys.filter((k) => pm.has(k) && isDue(pm.get(k))).length, 0);
  const sure = [...pm.values()].filter((p) => p.box >= 5).length;
  const goal = profile.daily_goal || 20;

  return (
    <div className="grid">
      <section className="card row" style={{ gap: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2>Hallo {profile.name}!</h2>
          <p className="muted" style={{ margin: ".3rem 0 0" }}>
            {vocabDue + mathDue > 0 ? <>Heute sind <b>{vocabDue + mathDue} Aufgaben</b> fällig.</> : today >= goal ? "Tagesziel geschafft. Super!" : "Alles wiederholt. Du kannst Neues lernen."}
          </p>
          <div className="goal" aria-label="Tagesziel"><i style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} /></div>
          <div className="small muted" style={{ marginTop: 4 }}>Tagesziel: {today} von {goal}</div>
        </div>
        <div className="stats">
          <div className="stat"><b>{st}</b><span>{st === 1 ? "Tag" : "Tage"} am Stück</span></div>
          <div className="stat"><b>{sure}</b><span>sitzen sicher</span></div>
        </div>
      </section>

      <div className="grid cols-2">
        {langs.map((l) => {
          const cs = allCards.filter((c) => c.lang.id === l.id);
          const d = dueCount(cs.map((c) => c.p));
          return (
            <section className="card" key={l.id}>
              <div className="row"><Tag short={l.short} color={l.color} /><h3>{l.name}</h3><span className="spacer" /><span className="small muted">{cs.length} Vokabeln</span></div>
              <Kasten counts={boxCounts(cs.map((c) => c.p))} />
              <div className="row" style={{ marginTop: 14 }}>
                <span className="small"><b>{d}</b> fällig</span><span className="spacer" />
                <button className="btn sm primary" disabled={!d} onClick={() => go("learn", { languageId: l.id })}>{l.name} üben</button>
              </div>
            </section>
          );
        })}
        {profile.subjects.includes("math") && (
          <section className="card">
            <div className="row"><Tag short="×" color="var(--accent)" /><h3>Mathe</h3></div>
            <p className="muted small">{mathStarted.length ? `${mathDue} Aufgaben fällig in ${mathStarted.map((x) => x.t.name).join(", ")}.` : "Noch nicht angefangen. Starte mit dem 1×1!"}</p>
            <button className="btn sm primary" onClick={() => go("math")}>Mathe üben</button>
          </section>
        )}
      </div>

      {profile.subjects.includes("lang") && !langs.length && (
        <section className="card grid">
          <h3>Noch keine Vokabeln</h3>
          <p className="muted" style={{ margin: 0 }}>Lege eine Lektion an: per Foto, Excel/CSV oder von Hand.</p>
          <div><button className="btn primary" onClick={() => go("import")}>Vokabeln hinzufügen</button></div>
        </section>
      )}
      {langs.length > 0 && <p className="small muted">Karteikasten: Jede richtige Antwort schiebt die Karte ein Fach weiter (Wiederholung nach 1, 3, 9, 29 und 90 Tagen), eine falsche schickt sie zurück in Fach 1.</p>}
    </div>
  );
}
