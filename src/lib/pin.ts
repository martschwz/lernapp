// PINs für Eltern und Kinder. Gespeichert wird nur ein Hash, nie die PIN selbst.
// Hinweis: Das ist ein Kinderschutz im Alltag, keine Hochsicherheit.
import { getState, upsert } from "./store";

export async function hashPin(pin: string): Promise<string> {
  const uid = getState().session?.user.id ?? "";
  const data = new TextEncoder().encode(`lernapp:${uid}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const parentPinHash = () => getState().data.family_settings[0]?.parent_pin_hash ?? null;

export async function setParentPin(pin: string | null) {
  const owner = getState().session!.user.id;
  upsert("family_settings", [{ owner, parent_pin_hash: pin ? await hashPin(pin) : null }]);
}

/* ---------- Eltern-Bereich entsperrt? (nur für diese Sitzung) ---------- */
let unlockedUntil = 0;
const UNLOCK_MS = 10 * 60 * 1000;
export const isParentUnlocked = () => !parentPinHash() || Date.now() < unlockedUntil;
export const unlockParent = () => { unlockedUntil = Date.now() + UNLOCK_MS; };
export const lockParent = () => { unlockedUntil = 0; };

/* ---------- PIN-Abfrage als Dialog ---------- */
export type PinRequest = {
  title: string;
  hint?: string;
  /** Liefert true, wenn die PIN stimmt. */
  check: (pin: string) => Promise<boolean>;
  /** Eltern-PIN vergessen: mit dem Konto-Passwort zurücksetzen. */
  allowReset?: boolean;
  resolve: (ok: boolean) => void;
};
let current: PinRequest | null = null;
const listeners = new Set<() => void>();
export const getPinRequest = () => current;
export function subscribePin(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function show(r: PinRequest | null) {
  current = r;
  listeners.forEach((l) => l());
}
export function requestPin(r: Omit<PinRequest, "resolve">): Promise<boolean> {
  return new Promise((resolve) => show({ ...r, resolve: (ok) => { show(null); resolve(ok); } }));
}

/** Fragt die Eltern-PIN ab (falls eine gesetzt ist). */
export async function ensureParent(): Promise<boolean> {
  if (isParentUnlocked()) return true;
  const ok = await requestPin({
    title: "Eltern-PIN",
    hint: "Dieser Bereich ist für Eltern.",
    allowReset: true,
    check: async (pin) => (await hashPin(pin)) === parentPinHash(),
  });
  if (ok) unlockParent();
  return ok;
}

/** Fragt beim Profilwechsel die PIN des Profils ab. Die Eltern-PIN gilt immer auch. */
export async function ensureProfilePin(name: string, pinHash: string | null | undefined): Promise<boolean> {
  if (!pinHash) return true;
  return requestPin({
    title: `PIN von ${name}`,
    hint: parentPinHash() ? "Eltern können auch ihre PIN eingeben." : undefined,
    check: async (pin) => {
      const h = await hashPin(pin);
      return h === pinHash || h === parentPinHash();
    },
  });
}
