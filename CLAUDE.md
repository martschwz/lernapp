# Lernapp – Hinweise für die Weiterentwicklung

Familien-Lern-App (Vokabeln + Mathe) mit Karteikasten. Die Familie pflegt den Code ausschließlich über Claude; Erklärungen an die Nutzer auf Deutsch, einfach und ohne Fachjargon.

## Technik
- React 18 + TypeScript + Vite 6, PWA über `vite-plugin-pwa`. Kein Router: `src/App.tsx` schaltet Ansichten über einen `view`-State.
- Supabase (Auth mit E-Mail/Passwort, Postgres mit RLS „owner = auth.uid()“). Ein Login = eine Familie; Kinder sind Zeilen in `profiles`.
- Hosting: GitHub Pages unter `/lernapp/` (Workflow `.github/workflows/deploy.yml`, `base` in `vite.config.ts`).
- Fotoerkennung: Supabase Edge Function `supabase/functions/scan-vocab` ruft die Claude API auf (Secret `ANTHROPIC_API_KEY`). Der Schlüssel darf nie in den Frontend-Code.

## Daten (`supabase/migrations/`)
`profiles`, `languages` (frei anlegbar, mit Sonderzeichen, TTS-Code, Prüfmodus), `units` (Lektion, gehört zu Profil + Sprache), `cards`, `progress` (Karteikasten pro Profil, Schlüssel `item_key`: `card:<uuid>`, `mul:<reihe>:<faktor>`, `div:…`, `big:…`, `sq:<n>`), `activity` (Tagesstatistik).
Schemaänderungen immer als neue Datei `supabase/migrations/000N_….sql` (idempotent) und dem Nutzer sagen, dass er sie im SQL Editor ausführen muss.

## Wichtige Dateien
- `src/lib/store.ts` – lädt alle Daten, Cache in localStorage, Outbox-Warteschlange für Offline-Änderungen (`upsert`, `remove`, `recordAnswer`).
- `src/lib/srs.ts` – Karteikasten (Fächer 0–6, Intervalle 0/0/1/3/9/29/90 Tage).
- `src/lib/check.ts` – tolerante Antwortprüfung (Bedeutungen mit `;`, Tippfehler, Akzente).
- `src/lib/math.ts` – Mathe-Themen und Aufgaben-Schlüssel.
- `src/components/Quiz.tsx` – gemeinsame Abfrage (Eintippen, Auswahl, Karteikarte, Zahlenblock).
- `src/views/*` – Ansichten. Kindermodus (Klasse 1–4) über `body.kid`.

## Regeln
- Vor jedem Commit: `npx tsc --noEmit`, `npm test`, `npm run build`.
- Texte in der App auf Deutsch, kindgerecht und kurz.
- Geplante Erweiterungen: Lernwörter-Diktat (Deutsch, Vorlesen + Eintippen), Lernplan für Klassenarbeiten, Grammatik-Trainer (Latein-Deklinationen, unregelmäßige Verben), KI-Schnelleingabe (Wort → Übersetzung vorschlagen), eigene Tonaufnahmen und dritte Kartenseite (Schlesisch), Eltern-PIN.
