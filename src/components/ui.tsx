import { useEffect, useState } from "react";
import { BOX_COLORS, boxLabel } from "../lib/srs";

let showToast: (m: string) => void = () => {};
export const toast = (m: string) => showToast(m);
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    showToast = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2400);
    };
  }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Tag({ short, color }: { short: string; color: string }) {
  return <span className="tag" style={{ ["--c" as string]: color }}>{short}</span>;
}

/** Karteikasten als Balken: Anzahl je Fach (Index 0 = neu). */
export function Kasten({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="kasten" role="img" aria-label={"Karteikasten: " + counts.map((c, i) => `${boxLabel(i)}: ${c}`).join(", ")}>
      {counts.map((c, i) => (
        <div className="slot" key={i}>
          <span className="n">{c}</span>
          <div className="bar" style={{ ["--b" as string]: BOX_COLORS[i], height: `${Math.round((c / max) * 70)}%` }} />
          <span className="lbl">{boxLabel(i)}</span>
        </div>
      ))}
    </div>
  );
}

export const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
  </svg>
);

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

export function Confirm({ label, confirmLabel = "Ja, löschen", onConfirm }: { label: string; confirmLabel?: string; onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className="btn sm ghost" onClick={() => setAsk(true)}>{label}</button>;
  return (
    <span className="row">
      <span className="small">Wirklich?</span>
      <button className="btn sm bad" onClick={() => { setAsk(false); onConfirm(); }}>{confirmLabel}</button>
      <button className="btn sm ghost" onClick={() => setAsk(false)}>Nein</button>
    </span>
  );
}
