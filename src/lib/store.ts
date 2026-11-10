// Datenhaltung: Alle Daten der Familie werden beim Start geladen, im Gerät
// zwischengespeichert (offline nutzbar) und Änderungen werden über eine
// Warteschlange an Supabase geschickt, sobald Internet da ist.
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Activity, Card, Language, Profile, Progress, TableName, Tables, Unit } from "./types";
import { dayKey, nextState } from "./srs";

type Data = { [K in TableName]: Tables[K][] };

export type State = {
  session: Session | null;
  authReady: boolean;
  loaded: boolean;
  loadError: string | null;
  schemaOutdated: boolean; // Datenbank-Update (0002_pins.sql) fehlt noch
  data: Data;
  activeProfileId: string | null;
  pending: number;
  online: boolean;
};

const emptyData = (): Data => ({ family_settings: [], profiles: [], languages: [], units: [], cards: [], progress: [], activity: [] });

let state: State = {
  session: null,
  authReady: false,
  loaded: false,
  loadError: null,
  schemaOutdated: false,
  data: emptyData(),
  activeProfileId: null,
  pending: 0,
  online: navigator.onLine,
};
const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const getState = () => state;
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}

/* ---------- Schlüssel der Tabellen ---------- */
const PK: { [K in TableName]: (keyof Tables[K])[] } = {
  family_settings: ["owner"],
  profiles: ["id"],
  languages: ["id"],
  units: ["id"],
  cards: ["id"],
  progress: ["profile_id", "item_key"],
  activity: ["profile_id", "day"],
};
function keyOf<K extends TableName>(t: K, row: Partial<Tables[K]>): string {
  return PK[t].map((k) => String(row[k])).join("|");
}

/* ---------- Gerätespeicher ---------- */
const uid = () => state.session?.user.id ?? "anon";
const cacheKey = () => `lernapp:cache:${uid()}`;
const outboxKey = () => `lernapp:outbox:${uid()}`;
const activeKey = () => `lernapp:active:${uid()}`;

function readLS<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* Speicher voll oder gesperrt – App läuft trotzdem weiter */
  }
}
let cacheTimer: number | undefined;
function persistCache() {
  clearTimeout(cacheTimer);
  cacheTimer = window.setTimeout(() => writeLS(cacheKey(), state.data), 300);
}

/* ---------- Warteschlange für Änderungen ---------- */
type Op = { t: TableName; kind: "upsert" | "delete"; key: string; row: Record<string, unknown> };
let outbox: Op[] = [];
let flushing = false;
let flushTimer: number | undefined;

function enqueue(op: Op) {
  // Ältere Änderung am selben Datensatz ersetzen
  outbox = outbox.filter((o) => !(o.t === op.t && o.key === op.key));
  outbox.push(op);
  writeLS(outboxKey(), outbox);
  set({ pending: outbox.length });
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 600);
}

export async function flush() {
  if (flushing || !state.session || !outbox.length) return;
  flushing = true;
  try {
    while (outbox.length) {
      const op = outbox[0];
      // Gleichartige Upserts derselben Tabelle zusammenfassen
      if (op.kind === "upsert") {
        const batch = outbox.filter((o) => o.t === op.t && o.kind === "upsert").slice(0, 200);
        const rows = batch.map((o) => ({ ...o.row, updated_at: new Date().toISOString() }));
        const { error } = await supabase.from(op.t).upsert(rows, { onConflict: PK[op.t].join(",") });
        if (error) throw error;
        outbox = outbox.filter((o) => !batch.includes(o));
      } else {
        let q = supabase.from(op.t).delete();
        for (const k of PK[op.t]) q = q.eq(k as string, op.row[k as string] as string);
        const { error } = await q;
        if (error) throw error;
        outbox = outbox.slice(1);
      }
      writeLS(outboxKey(), outbox);
      set({ pending: outbox.length });
    }
  } catch (e) {
    console.warn("Synchronisation später erneut", e);
    clearTimeout(flushTimer);
    flushTimer = window.setTimeout(flush, 15000);
  } finally {
    flushing = false;
  }
}

/* ---------- Ändern ---------- */
export function upsert<K extends TableName>(t: K, rows: Tables[K][]) {
  if (!rows.length) return;
  const list = [...state.data[t]] as Tables[K][];
  const index = new Map(list.map((r, i) => [keyOf(t, r), i]));
  for (const r of rows) {
    const k = keyOf(t, r);
    const i = index.get(k);
    if (i === undefined) {
      index.set(k, list.length);
      list.push(r);
    } else list[i] = r;
    enqueue({ t, kind: "upsert", key: k, row: r as unknown as Record<string, unknown> });
  }
  set({ data: { ...state.data, [t]: list } });
  persistCache();
}

export function remove<K extends TableName>(t: K, rows: Tables[K][]) {
  const keys = new Set(rows.map((r) => keyOf(t, r)));
  const data = { ...state.data, [t]: (state.data[t] as Tables[K][]).filter((r) => !keys.has(keyOf(t, r))) };
  // Abhängige Daten lokal mit entfernen (in der Datenbank erledigt das "on delete cascade")
  if (t === "units") {
    const ids = new Set(rows.map((r) => (r as Unit).id));
    data.cards = data.cards.filter((c) => !ids.has(c.unit_id));
  }
  if (t === "profiles") {
    const ids = new Set(rows.map((r) => (r as Profile).id));
    data.units = data.units.filter((u) => !ids.has(u.profile_id));
    const unitIds = new Set(data.units.map((u) => u.id));
    data.cards = data.cards.filter((c) => unitIds.has(c.unit_id));
    data.progress = data.progress.filter((p) => !ids.has(p.profile_id));
    data.activity = data.activity.filter((a) => !ids.has(a.profile_id));
  }
  if (t === "languages") {
    const ids = new Set(rows.map((r) => (r as Language).id));
    data.units = data.units.filter((u) => !ids.has(u.language_id));
    const unitIds = new Set(data.units.map((u) => u.id));
    data.cards = data.cards.filter((c) => unitIds.has(c.unit_id));
  }
  set({ data });
  persistCache();
  for (const r of rows) enqueue({ t, kind: "delete", key: keyOf(t, r), row: r as unknown as Record<string, unknown> });
}

export const newId = () => crypto.randomUUID();

/* ---------- Laden ---------- */
const TABLES: TableName[] = ["profiles", "languages", "units", "cards", "progress", "activity"];
// Tabellen aus späteren Datenbank-Updates: fehlen sie, läuft die App trotzdem weiter
const OPTIONAL_TABLES: TableName[] = ["family_settings"];

async function fetchAll<K extends TableName>(t: K): Promise<Tables[K][]> {
  const out: Tables[K][] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(t).select("*").range(from, from + page - 1);
    if (error) throw error;
    out.push(...((data ?? []) as Tables[K][]));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function loadAll() {
  if (!state.session) return;
  // Sofort aus dem Gerätespeicher anzeigen, dann frisch laden
  const cached = readLS<Data | null>(cacheKey(), null);
  outbox = readLS<Op[]>(outboxKey(), []);
  if (cached) set({ data: cached, loaded: true, pending: outbox.length });
  set({ activeProfileId: readLS<string | null>(activeKey(), null) });
  try {
    await flush();
    const results = await Promise.all(TABLES.map((t) => fetchAll(t)));
    const data = emptyData();
    TABLES.forEach((t, i) => ((data as Record<TableName, unknown[]>)[t] = results[i]));
    let schemaOutdated = false;
    for (const t of OPTIONAL_TABLES) {
      try {
        (data as Record<TableName, unknown[]>)[t] = await fetchAll(t);
      } catch {
        schemaOutdated = true;
      }
    }
    set({ schemaOutdated });
    // Noch nicht hochgeladene Änderungen beibehalten
    for (const op of outbox) {
      const list = data[op.t] as unknown as Record<string, unknown>[];
      const idx = list.findIndex((r) => keyOf(op.t, r as never) === op.key);
      if (op.kind === "upsert") idx >= 0 ? (list[idx] = op.row) : list.push(op.row);
      else if (idx >= 0) list.splice(idx, 1);
    }
    set({ data, loaded: true, loadError: null });
    persistCache();
    if (!data.languages.length) seedLanguages();
  } catch (e) {
    console.warn(e);
    set({
      loaded: true,
      loadError: cached
        ? null
        : "Die Daten konnten nicht geladen werden. Ist die Datenbank schon eingerichtet (siehe Anleitung)? Prüfe auch die Internetverbindung.",
    });
  }
}

export function setActiveProfile(id: string | null) {
  writeLS(activeKey(), id);
  set({ activeProfileId: id });
}

/* ---------- Start-Sprachen ---------- */
function seedLanguages() {
  const base = { created_at: new Date().toISOString() };
  upsert("languages", [
    { ...base, id: newId(), name: "Englisch", short: "EN", tts: "en-GB", chars: "", info_label: "Lautschrift / Hinweis", lenient: false, color: "#1f7a8c", default_dir: "de" },
    { ...base, id: newId(), name: "Latein", short: "LA", tts: null, chars: "āēīōū", info_label: "Grammatik (Genitiv, Genus, Stammformen)", lenient: false, color: "#a8322d", default_dir: "fs" },
    { ...base, id: newId(), name: "Polnisch", short: "PL", tts: "pl-PL", chars: "ąćęłńóśźż", info_label: "Genus / Aspektpaar", lenient: false, color: "#c0392b", default_dir: "de" },
    { ...base, id: newId(), name: "Schlesisch", short: "SL", tts: null, chars: "ãõōŏôůćłńśźż", info_label: "Hinweis", lenient: true, color: "#c28a12", default_dir: "de" },
  ]);
}

/* ---------- Lernen ---------- */
export function recordAnswer(profileId: string, itemKey: string | null, correct: boolean) {
  if (itemKey) {
    const old = state.data.progress.find((p) => p.profile_id === profileId && p.item_key === itemKey);
    const n = nextState(old?.box ?? 0, correct);
    const row: Progress = {
      profile_id: profileId,
      item_key: itemKey,
      box: n.box,
      due: n.due,
      right_count: (old?.right_count ?? 0) + (correct ? 1 : 0),
      wrong_count: (old?.wrong_count ?? 0) + (correct ? 0 : 1),
    };
    upsert("progress", [row]);
  }
  const day = dayKey();
  const a = state.data.activity.find((x) => x.profile_id === profileId && x.day === day);
  const act: Activity = { profile_id: profileId, day, answers: (a?.answers ?? 0) + 1, correct: (a?.correct ?? 0) + (correct ? 1 : 0) };
  upsert("activity", [act]);
}

/** Eine Antwort nachträglich als richtig werten ("Ich hatte recht"). */
export function overrideAnswer(profileId: string, itemKey: string | null, before: Progress | undefined) {
  if (itemKey) {
    const n = nextState(before?.box ?? 0, true);
    upsert("progress", [{
      profile_id: profileId,
      item_key: itemKey,
      box: n.box,
      due: n.due,
      right_count: (before?.right_count ?? 0) + 1,
      wrong_count: before?.wrong_count ?? 0,
    }]);
  }
  const day = dayKey();
  const a = state.data.activity.find((x) => x.profile_id === profileId && x.day === day);
  if (a) upsert("activity", [{ ...a, correct: a.correct + 1 }]);
}

/* ---------- Anmeldung ---------- */
export function initAuth() {
  supabase.auth.getSession().then(({ data }) => {
    set({ session: data.session, authReady: true });
    if (data.session) loadAll();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const changedUser = session?.user.id !== state.session?.user.id;
    set({ session, authReady: true });
    if (event === "SIGNED_OUT") set({ data: emptyData(), loaded: false, activeProfileId: null });
    else if (changedUser && session) loadAll();
  });
  window.addEventListener("online", () => {
    set({ online: true });
    flush();
  });
  window.addEventListener("offline", () => set({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.session) flush().then(() => refreshIfIdle());
  });
}

// Beim Zurückkehren in die App den Stand von anderen Geräten holen
let busy = false;
export function setBusy(b: boolean) { busy = b; }
async function refreshIfIdle() {
  if (busy || outbox.length) return;
  await loadAll();
}

export type { Card, Language, Profile, Progress, Unit, Activity };
