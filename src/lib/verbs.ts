// Unregelmäßige englische Verben: Grundform, simple past, past participle, Deutsch.
// "/" trennt gleichwertige Formen (was/were, burnt/burned). Klammern sind beim Eintippen freiwillig.
// basic = gehört zur Grundliste (Klasse 5/6).
export type Verb = { inf: string; past: string; part: string; de: string; basic?: boolean };

const V = (inf: string, past: string, part: string, de: string, basic = false): Verb => ({ inf, past, part, de, basic });

export const VERBS: Verb[] = [
  V("be", "was/were", "been", "sein", true),
  V("beat", "beat", "beaten", "schlagen; besiegen"),
  V("become", "became", "become", "werden", true),
  V("begin", "began", "begun", "beginnen; anfangen", true),
  V("bet", "bet", "bet", "wetten"),
  V("bite", "bit", "bitten", "beißen"),
  V("blow", "blew", "blown", "blasen; wehen"),
  V("break", "broke", "broken", "(zer)brechen; kaputt machen", true),
  V("bring", "brought", "brought", "(mit)bringen", true),
  V("build", "built", "built", "bauen", true),
  V("burn", "burnt/burned", "burnt/burned", "(ver)brennen"),
  V("buy", "bought", "bought", "kaufen", true),
  V("catch", "caught", "caught", "fangen", true),
  V("choose", "chose", "chosen", "(aus)wählen", true),
  V("come", "came", "come", "kommen", true),
  V("cost", "cost", "cost", "kosten", true),
  V("cut", "cut", "cut", "schneiden", true),
  V("deal (with)", "dealt (with)", "dealt (with)", "sich befassen (mit); umgehen (mit)"),
  V("do", "did", "done", "machen; tun", true),
  V("draw", "drew", "drawn", "zeichnen; ziehen", true),
  V("dream", "dreamt/dreamed", "dreamt/dreamed", "träumen"),
  V("drink", "drank", "drunk", "trinken", true),
  V("drive", "drove", "driven", "fahren", true),
  V("eat", "ate", "eaten", "essen", true),
  V("fall", "fell", "fallen", "(hin)fallen", true),
  V("feed", "fed", "fed", "füttern; ernähren"),
  V("feel", "felt", "felt", "fühlen", true),
  V("fight", "fought", "fought", "kämpfen; (sich) streiten", true),
  V("find", "found", "found", "finden", true),
  V("fit", "fit/fitted", "fit/fitted", "passen"),
  V("fly", "flew", "flown", "fliegen", true),
  V("forget", "forgot", "forgotten", "vergessen", true),
  V("forgive", "forgave", "forgiven", "vergeben; verzeihen"),
  V("freeze", "froze", "frozen", "gefrieren; erstarren", true),
  V("get", "got", "got", "bekommen; erhalten", true),
  V("give", "gave", "given", "geben", true),
  V("go", "went", "gone", "gehen; fahren", true),
  V("grow", "grew", "grown", "wachsen; anbauen; züchten", true),
  V("hang", "hung", "hung", "hängen"),
  V("have", "had", "had", "haben", true),
  V("hear", "heard", "heard", "hören", true),
  V("hide", "hid", "hidden", "(sich) verstecken", true),
  V("hit", "hit", "hit", "schlagen; treffen", true),
  V("hold", "held", "held", "(fest)halten", true),
  V("hurt", "hurt", "hurt", "verletzen; sich wehtun", true),
  V("keep", "kept", "kept", "behalten; aufbewahren", true),
  V("know", "knew", "known", "wissen; kennen", true),
  V("lay", "laid", "laid", "legen; decken (Tisch)"),
  V("lead", "led", "led", "führen; leiten"),
  V("learn", "learnt/learned", "learnt/learned", "lernen", true),
  V("leave", "left", "left", "(ver)lassen; abfahren", true),
  V("lend", "lent", "lent", "(ver)leihen"),
  V("let", "let", "let", "lassen", true),
  V("lie", "lay", "lain", "liegen"),
  V("light", "lit", "lit", "anzünden"),
  V("lose", "lost", "lost", "verlieren", true),
  V("make", "made", "made", "machen; herstellen", true),
  V("mean", "meant", "meant", "bedeuten; meinen", true),
  V("meet", "met", "met", "treffen; kennenlernen", true),
  V("pay", "paid", "paid", "(be)zahlen", true),
  V("put", "put", "put", "legen; stellen; setzen", true),
  V("read", "read", "read", "lesen", true),
  V("ride", "rode", "ridden", "reiten; (Rad) fahren", true),
  V("ring", "rang", "rung", "klingeln; läuten", true),
  V("run", "ran", "run", "rennen; laufen", true),
  V("say", "said", "said", "sagen", true),
  V("see", "saw", "seen", "sehen", true),
  V("sell", "sold", "sold", "verkaufen", true),
  V("send", "sent", "sent", "schicken; senden", true),
  V("set", "set", "set", "setzen; stellen"),
  V("shake", "shook", "shaken", "schütteln"),
  V("shine", "shone", "shone", "scheinen; leuchten"),
  V("shoot", "shot", "shot", "schießen"),
  V("show", "showed", "shown", "zeigen", true),
  V("shut", "shut", "shut", "schließen; zumachen"),
  V("sing", "sang", "sung", "singen", true),
  V("sink", "sank", "sunk", "sinken"),
  V("sit", "sat", "sat", "sitzen", true),
  V("sleep", "slept", "slept", "schlafen", true),
  V("smell", "smelt/smelled", "smelt/smelled", "riechen"),
  V("speak", "spoke", "spoken", "sprechen", true),
  V("spell", "spelt/spelled", "spelt/spelled", "buchstabieren"),
  V("spend", "spent", "spent", "ausgeben (Geld); verbringen (Zeit)", true),
  V("stand", "stood", "stood", "stehen", true),
  V("steal", "stole", "stolen", "stehlen", true),
  V("stick", "stuck", "stuck", "kleben; stecken"),
  V("swim", "swam", "swum", "schwimmen", true),
  V("take", "took", "taken", "nehmen; bringen", true),
  V("teach", "taught", "taught", "unterrichten; beibringen", true),
  V("tell", "told", "told", "erzählen; sagen", true),
  V("think", "thought", "thought", "denken; glauben", true),
  V("throw", "threw", "thrown", "werfen", true),
  V("understand", "understood", "understood", "verstehen", true),
  V("wake (up)", "woke (up)", "woken (up)", "aufwachen; wecken", true),
  V("wear", "wore", "worn", "tragen (Kleidung)", true),
  V("win", "won", "won", "gewinnen", true),
  V("write", "wrote", "written", "schreiben", true),
];

export const verbKey = (v: Verb) => `irr:${v.inf.replace(/\s*\(.*\)/, "")}`;

/** Für den Vergleich: klein, ohne "to", Klammern freiwillig. */
function forms(s: string): string[] {
  const base = s.toLowerCase().trim().replace(/\s+/g, " ").replace(/^to /, "");
  const without = base.replace(/\s*\([^)]*\)/g, "").trim();
  const withText = base.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  return [...new Set([without, withText])];
}

/** Prüft eine Verbform. Bei "was/were" reicht eine der Formen, beide sind auch richtig. Keine Tippfehler-Toleranz. */
export function checkForm(given: string, expected: string): boolean {
  const allowed = new Set(expected.split("/").flatMap(forms));
  const parts = given.split(/\s*(?:\/|,| or | oder )\s*/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => forms(p).some((f) => allowed.has(f)));
}
