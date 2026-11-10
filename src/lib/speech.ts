// Vorlesen über die Sprachausgabe des Geräts.
export function canSpeak(lang: string | null | undefined): boolean {
  return !!lang && typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, lang: string | null | undefined, rate = 0.9) {
  if (!canSpeak(lang)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang!;
    u.rate = rate;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(lang!));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch {
    /* Sprachausgabe nicht verfügbar */
  }
}

export const TTS_OPTIONS: { code: string; label: string }[] = [
  { code: "", label: "keine Stimme" },
  { code: "en-GB", label: "Englisch (britisch)" },
  { code: "en-US", label: "Englisch (amerikanisch)" },
  { code: "pl-PL", label: "Polnisch" },
  { code: "fr-FR", label: "Französisch" },
  { code: "es-ES", label: "Spanisch" },
  { code: "it-IT", label: "Italienisch" },
  { code: "de-DE", label: "Deutsch" },
];
