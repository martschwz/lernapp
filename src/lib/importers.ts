// Vokabeln aus Text, CSV, Excel oder Foto einlesen. Ergebnis: Zeilen [Fremdsprache, Deutsch, Hinweis].
import { supabase } from "./supabase";

export type Row = [string, string, string];

const HEADER = /^(englisch|english|latein|latin|polnisch|polski|schlesisch|fremdsprache|vokabel|vokabeln|wort|begriff|fs|französisch|spanisch)$/i;

export function cleanRows(rows: unknown[][]): Row[] {
  let out = rows
    .map((r) => [0, 1, 2].map((i) => String(r[i] ?? "").trim()) as Row)
    .filter((r) => r[0] || r[1]);
  if (out.length && HEADER.test(out[0][0])) out = out.slice(1);
  return out;
}

export function parseText(text: string): Row[] {
  return cleanRows(
    text.split(/\r?\n/).map((line) => {
      for (const sep of ["\t", " = ", ";", " – ", " - "]) if (line.includes(sep)) return line.split(sep);
      if (line.includes(",") && line.split(",").length === 2) return line.split(",");
      return [line, ""];
    }),
  );
}

export async function parseFile(file: File): Promise<Row[]> {
  if (/\.(csv|txt|tsv)$/i.test(file.name)) return parseText(await file.text());
  const { default: readXlsxFile } = await import("read-excel-file");
  const rows = await readXlsxFile(file);
  return cleanRows(rows as unknown[][]);
}

/** Bild verkleinern (spart Datenvolumen und Kosten), Ergebnis als Base64-JPEG. */
async function downscale(file: File, maxSide = 1800): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return url.slice(url.indexOf(",") + 1);
}

export async function scanPhoto(file: File, languageName: string, infoLabel: string): Promise<Row[]> {
  const image = await downscale(file);
  const { data, error } = await supabase.functions.invoke("scan-vocab", {
    body: { image, mediaType: "image/jpeg", language: languageName, infoLabel },
  });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) throw new Error("Die Fotoerkennung ist noch nicht eingerichtet (siehe Anleitung, Schritt „Fotoerkennung“).");
    throw new Error("Das Foto konnte nicht gelesen werden. Versuche es mit einem schärferen, helleren Foto.");
  }
  const words = (data?.words ?? []) as { term: string; translation: string; info: string }[];
  return cleanRows(words.map((w) => [w.term, w.translation, w.info]));
}
