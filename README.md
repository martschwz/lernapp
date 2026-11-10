# Lernapp

Lern-App für die ganze Familie: Vokabeln (Englisch, Latein, Polnisch, Schlesisch und beliebige weitere Sprachen) und Mathe (1×1, Geteilt, großes 1×1, Quadratzahlen, Plus/Minus bis 1000) mit Karteikasten-System.

- Läuft im Browser auf Tablet, Handy und PC und lässt sich wie eine App auf den Startbildschirm legen.
- Ein Familienkonto, darin ein Profil pro Kind oder Erwachsenem.
- Synchronisation über Supabase, funktioniert auch offline (Änderungen werden nachgereicht).
- Vokabeln per Foto (KI-Erkennung), Excel/CSV, Text oder von Hand.

**Adresse:** https://martschwz.github.io/lernapp/

## Einrichtung (einmalig)

### 1. Datenbank anlegen
1. In Supabase das Projekt öffnen, links **SQL Editor** → **New query**.
2. Den kompletten Inhalt von [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) einfügen und auf **Run** klicken.
3. Es sollte „Success. No rows returned“ erscheinen.

### 2. Anmeldung einstellen
In Supabase unter **Authentication → URL Configuration**:
- **Site URL:** `https://martschwz.github.io/lernapp/`
- Bei **Redirect URLs** dieselbe Adresse hinzufügen.

### 3. Veröffentlichung auf GitHub Pages einschalten
Im GitHub-Projekt unter **Settings → Pages** bei **Source** „**GitHub Actions**“ auswählen. Danach wird die App bei jeder Änderung automatisch neu veröffentlicht.

### 4. Fotoerkennung (sobald der Anthropic-Schlüssel da ist)
1. In Supabase links **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name: `scan-vocab`. Den Inhalt von [`supabase/functions/scan-vocab/index.ts`](supabase/functions/scan-vocab/index.ts) einfügen und **Deploy** klicken.
3. In Supabase unter **Edge Functions → Secrets** (bzw. **Project Settings → Edge Functions**) ein Secret anlegen: Name `ANTHROPIC_API_KEY`, Wert = dein Schlüssel `sk-ant-…`.

Kosten: etwa 3–5 Cent pro Foto. Ein Ausgabenlimit in der Anthropic-Konsole verhindert Überraschungen.

## Entwicklung

```bash
npm install
npm run dev     # lokal starten
npm test        # Tests
npm run build   # fertige App in dist/
```

Aufbau: siehe [CLAUDE.md](CLAUDE.md).
