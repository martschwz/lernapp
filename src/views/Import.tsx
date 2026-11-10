import { useRef, useState } from "react";
import { getState, newId, upsert, useStore, type Profile } from "../lib/store";
import { parseFile, parseText, scanPhoto, type Row } from "../lib/importers";
import { toast } from "../components/ui";

export function Import({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const s = useStore((x) => x);
  const langs = [...s.data.languages].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const [langId, setLangId] = useState(langs[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const photoIn = useRef<HTMLInputElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const lang = langs.find((l) => l.id === langId) ?? langs[0];
  if (!lang) return <div className="card">Sprachen werden geladen …</div>;
  const units = s.data.units.filter((u) => u.profile_id === profile.id && u.language_id === lang.id);

  const addRows = (r: Row[], source: string) => {
    setRows((x) => [...x, ...r]);
    setMsg(r.length ? { text: `${r.length} Vokabeln aus ${source} übernommen. Bitte unten prüfen und speichern.` } : { text: `In ${source} wurden keine Vokabeln gefunden.`, err: true });
  };
  async function onFile(f: File) {
    try { addRows(await parseFile(f), f.name); }
    catch { setMsg({ text: "Die Datei konnte nicht gelesen werden. Speichere sie als .xlsx oder .csv und versuche es erneut.", err: true }); }
  }
  async function onPhoto(f: File) {
    setScanning(true);
    setMsg({ text: "Foto wird gelesen … das dauert etwa 10 bis 30 Sekunden." });
    try { addRows(await scanPhoto(f, lang.name, lang.info_label), "dem Foto"); }
    catch (e) { setMsg({ text: (e as Error).message, err: true }); }
    finally { setScanning(false); }
  }
  function save() {
    const good = rows.filter((r) => r[0].trim() && r[1].trim());
    if (!good.length) return setMsg({ text: "Jede Vokabel braucht die Fremdsprache und die deutsche Bedeutung.", err: true });
    let uid = unitId;
    if (!uid) {
      if (!newName.trim()) return setMsg({ text: "Gib der neuen Lektion einen Namen, z. B. „Unit 3“.", err: true });
      uid = newId();
      upsert("units", [{ id: uid, profile_id: profile.id, language_id: lang.id, name: newName.trim(), created_at: new Date().toISOString() }]);
    }
    const start = Math.max(0, ...getState().data.cards.filter((c) => c.unit_id === uid).map((c) => c.position)) + 1;
    upsert("cards", good.map((r, i) => ({ id: newId(), unit_id: uid, term: r[0].trim(), translation: r[1].trim(), info: r[2].trim(), position: start + i })));
    toast(`${good.length} Vokabeln gespeichert`);
    setRows([]); setMsg(null); setNewName(""); setPaste("");
    onSaved();
  }
  const dropProps = (handler: (f: File) => void) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.add("over"); },
    onDragLeave: (e: React.DragEvent) => e.currentTarget.classList.remove("over"),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) handler(f); },
  });

  return (
    <div className="grid">
      <section className="card grid">
        <h2>Vokabeln hinzufügen für {profile.name}</h2>
        <div className="fields">
          <label className="f">Sprache<select value={lang.id} onChange={(e) => { setLangId(e.target.value); setUnitId(""); }}>{langs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label className="f">In Lektion<select value={unitId} onChange={(e) => setUnitId(e.target.value)}><option value="">Neue Lektion …</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          {!unitId && <label className="f">Name der neuen Lektion<input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={lang.short === "LA" ? "z. B. Roma A · Lektion 5" : lang.short === "EN" ? "z. B. Green Line 2 · Unit 3" : "z. B. Kapitel 1"} /></label>}
        </div>
      </section>
      <div className="grid cols-2">
        <section className="card grid">
          <h3>Foto der Vokabelliste</h3>
          <p className="small muted" style={{ margin: 0 }}>Seite aus Buch, Heft oder ein Bildschirmfoto (z. B. aus Duolingo). Möglichst gerade und hell fotografieren. Danach prüfst du die erkannten Wörter.</p>
          <div className="drop" {...dropProps(onPhoto)}>
            <input ref={photoIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
            <button className="btn primary" disabled={scanning} onClick={() => photoIn.current?.click()}>{scanning ? "Wird gelesen …" : "Foto auswählen"}</button>
            <span className="small muted">oder Bild hierher ziehen</span>
          </div>
        </section>
        <section className="card grid">
          <h3>Excel- oder CSV-Datei</h3>
          <p className="small muted" style={{ margin: 0 }}>Spalte A: {lang.name}, Spalte B: Deutsch, Spalte C (optional): {lang.info_label}. Eine Kopfzeile wird erkannt.</p>
          <div className="drop" {...dropProps(onFile)}>
            <input ref={fileIn} type="file" accept=".csv,.xlsx,.txt,.tsv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            <button className="btn" onClick={() => fileIn.current?.click()}>Datei auswählen</button>
            <span className="small muted">.xlsx, .csv</span>
          </div>
        </section>
      </div>
      <section className="card grid">
        <h3>Text einfügen oder eintippen</h3>
        <p className="small muted" style={{ margin: 0 }}>Eine Vokabel pro Zeile, getrennt durch Tabulator, Semikolon oder „ = “. Beispiel: <code>{lang.short === "LA" ? "amicus = Freund = amici m" : lang.short === "PL" ? "dom = Haus = m" : "to arrive = ankommen"}</code></p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Vokabeln als Text" />
        <div><button className="btn" onClick={() => addRows(parseText(paste), "dem Text")}>In Tabelle übernehmen</button></div>
      </section>
      {msg && <div className={`notice ${msg.err ? "err" : ""}`} role="status">{msg.text}</div>}
      {rows.length > 0 && (
        <section className="card grid">
          <div className="row"><h3>Vorschau: {rows.length} Vokabeln</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => { setRows([]); setMsg(null); }}>Verwerfen</button></div>
          <div className="tbl"><table>
            <thead><tr><th>{lang.name}</th><th>Deutsch</th><th>{lang.info_label}</th><th></th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}>
                {[0, 1, 2].map((c) => (
                  <td key={c}><input type="text" value={r[c]} aria-label={["Fremdsprache", "Deutsch", "Hinweis"][c]}
                    onChange={(e) => setRows((x) => x.map((row, k) => (k === i ? (row.map((v, j) => (j === c ? e.target.value : v)) as Row) : row)))} /></td>
                ))}
                <td><button className="btn sm ghost" aria-label="Zeile entfernen" onClick={() => setRows((x) => x.filter((_, k) => k !== i))}>✕</button></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="row"><button className="btn sm" onClick={() => setRows((x) => [...x, ["", "", ""]])}>+ Zeile</button><span className="spacer" /><button className="btn primary" onClick={save}>Speichern</button></div>
        </section>
      )}
    </div>
  );
}
