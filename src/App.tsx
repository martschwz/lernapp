import { useEffect, useState } from "react";
import { useStore } from "./lib/store";
import { isKid } from "./lib/selectors";
import { Login } from "./views/Login";
import { ProfilePicker } from "./views/Profiles";
import { Home } from "./views/Home";
import { Learn, Words } from "./views/Vocab";
import { Import } from "./views/Import";
import { MathTrainer } from "./views/Math";
import { Settings } from "./views/Settings";
import { Toaster } from "./components/ui";
import { PinModal } from "./components/PinModal";
import { lockParent } from "./lib/pin";

export type View = "home" | "learn" | "words" | "math" | "import" | "settings" | "pick";

export default function App() {
  const authReady = useStore((s) => s.authReady);
  const session = useStore((s) => s.session);
  const loaded = useStore((s) => s.loaded);
  const loadError = useStore((s) => s.loadError);
  const profiles = useStore((s) => s.data.profiles);
  const activeId = useStore((s) => s.activeProfileId);
  const pending = useStore((s) => s.pending);
  const online = useStore((s) => s.online);
  const [view, setView] = useState<View>("home");
  const [langId, setLangId] = useState<string | undefined>();
  const [nonce, setNonce] = useState(0); // erzwingt Neustart einer Ansicht beim erneuten Antippen

  const profile = profiles.find((p) => p.id === activeId);
  useEffect(() => { document.body.classList.toggle("kid", !!profile && isKid(profile.grade)); }, [profile]);

  if (!authReady) return null;
  if (!session) return <><Login /><Toaster /></>;
  if (!loaded) return <main className="wrap"><div className="card narrow">Wird geladen …</div></main>;

  const go = (v: View, opts?: { languageId?: string }) => { if (v !== "settings") lockParent(); setLangId(opts?.languageId); setView(v); setNonce((n) => n + 1); window.scrollTo(0, 0); };
  const showPicker = !profile || view === "pick";
  const tabs: [View, string][] = profile ? [
    ["home", "Heute"],
    ...(profile.subjects.includes("lang") ? [["learn", "Vokabeln lernen"], ["words", "Vokabeln"]] as [View, string][] : []),
    ...(profile.subjects.includes("math") ? [["math", "Mathe"]] as [View, string][] : []),
    ...(profile.subjects.includes("lang") ? [["import", "Hinzufügen"]] as [View, string][] : []),
    ["settings", "Eltern"],
  ] : [];

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="topbar">
            <div className="brand"><img src={import.meta.env.BASE_URL + "icon.svg"} alt="" /><h1>Lernapp</h1></div>
            <span className={`chip ${!online ? "warn" : pending ? "" : "ok"}`} title="Synchronisation">
              {!online ? "Offline" : pending ? "Wird gespeichert …" : "Synchronisiert"}
            </span>
            {profile && <button className="who" onClick={() => go("pick")} aria-label="Profil wechseln"><span className="avatar">{profile.avatar}</span>{profile.name}</button>}
          </div>
          {!showPicker && (
            <nav className="tabs" aria-label="Bereiche">
              {tabs.map(([v, l]) => <button key={v} aria-current={view === v ? "page" : undefined} onClick={() => go(v)}>{l}</button>)}
            </nav>
          )}
        </div>
      </header>
      <main className="wrap">
        {loadError && <div className="notice err" style={{ marginBottom: 12 }}>{loadError}</div>}
        {showPicker ? <ProfilePicker onPicked={() => go("home")} /> : (
          <div key={`${view}-${nonce}-${profile.id}`}>
            {view === "home" && <Home profile={profile} go={go} />}
            {view === "learn" && <Learn profile={profile} initialLanguageId={langId} onHome={() => go("home")} />}
            {view === "words" && <Words profile={profile} onLearnUnit={(u) => go("learn", { languageId: u.language_id })} />}
            {view === "math" && <MathTrainer profile={profile} onHome={() => go("home")} />}
            {view === "import" && <Import profile={profile} onSaved={() => go("words")} />}
            {view === "settings" && <Settings />}
          </div>
        )}
      </main>
      <PinModal />
      <Toaster />
    </>
  );
}
