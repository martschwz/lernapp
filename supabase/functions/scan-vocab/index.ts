// Supabase Edge Function: liest eine Vokabelliste von einem Foto.
// Der Anthropic-API-Schlüssel liegt als Secret ANTHROPIC_API_KEY in Supabase
// und gelangt nie in die App selbst. Nur angemeldete Nutzer dürfen die Funktion aufrufen.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          info: { type: "string" },
        },
        required: ["term", "translation", "info"],
        additionalProperties: false,
      },
    },
  },
  required: ["words"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Nur für angemeldete Familienkonten
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: user } = await sb.auth.getUser();
  if (!user?.user) return json({ error: "not_signed_in" }, 401);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "missing_api_key" }, 500);

  let body: { image?: string; mediaType?: string; language?: string; infoLabel?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const { image, mediaType = "image/jpeg", language = "Englisch", infoLabel = "Hinweis" } = body;
  if (!image || image.length > 8_000_000) return json({ error: "bad_image" }, 400);

  const prompt = `Das Bild zeigt eine Vokabelliste (${language} – Deutsch), z. B. aus einem Schulbuch, Heft oder einer Lern-App.
Lies ALLE Vokabeln vollständig und in der Reihenfolge des Bildes aus.
- term: das Wort oder der Ausdruck auf ${language}, ohne Lautschrift. Englische Verben mit "to" (z. B. "to arrive"). Lateinische Substantive nur im Nominativ, Verben im Infinitiv.
- translation: die deutsche(n) Bedeutung(en), mehrere mit "; " getrennt.
- info: ${infoLabel}, falls auf dem Bild angegeben (z. B. bei Latein Genitiv und Genus wie "amici m" oder Stammformen wie "laboro, laboravi, laboratum"), sonst leer.
Beispielsätze, Seitenzahlen und Überschriften weglassen. Wenn keine Vokabeln lesbar sind, gib eine leere Liste zurück.`;

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "refused" }, 422);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ words: [] });
    return json(JSON.parse(text.text));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "bad_api_key" }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: "api_error", status: e.status }, 502);
    return json({ error: "unknown" }, 500);
  }
});
