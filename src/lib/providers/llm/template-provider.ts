import type { GeneratedScript, ScriptGenerationRequest, ScriptProvider } from "@/lib/providers/llm/types";

const HOOK_TEMPLATES: Record<string, (p: ScriptGenerationRequest) => string> = {
  "Problem-Agitate-Solve": (p) =>
    `Niemand sagt dir, dass ${p.productName} genau DAS Problem löst, das du seit Wochen ignorierst.`,
  Frage: (p) => `Warum benutzt hier eigentlich noch niemand ${p.productName}?`,
  Behauptung: (p) => `${p.productName} hat meine Routine komplett verändert — und das meine ich ernst.`,
  "Vorher-Nachher": (p) => `Vorher: frustriert. Nachher: ${p.productName}. So einfach war das.`,
  Storytelling: (p) => `Ich war skeptisch, bis ich ${p.productName} das erste Mal ausprobiert habe.`,
};

const TONE_VOICE: Record<string, string> = {
  Locker: "locker, direkt, wie unter Freunden",
  Professionell: "sachlich, kompetent, vertrauenswürdig",
  Humorvoll: "humorvoll, überraschend, leicht selbstironisch",
  Emotional: "warm, persönlich, emotional ehrlich",
};

function sceneList(durationSec: number): GeneratedScript["sceneList"] {
  const hook = Math.max(2, Math.round(durationSec * 0.12));
  const problem = Math.max(3, Math.round(durationSec * 0.18));
  const demo = Math.max(5, Math.round(durationSec * 0.35));
  const benefit = Math.max(3, Math.round(durationSec * 0.2));
  const cta = Math.max(2, durationSec - hook - problem - demo - benefit);

  return [
    { scene: 1, description: "Hook in Nahaufnahme, direkter Blick in die Kamera", durationSec: hook },
    { scene: 2, description: "Problem-Situation aus dem Alltag der Zielgruppe", durationSec: problem },
    { scene: 3, description: "Produkteinsatz / Demonstration in Echtzeit", durationSec: demo },
    { scene: 4, description: "Sichtbares Ergebnis / Nutzen betonen", durationSec: benefit },
    { scene: 5, description: "CTA mit klarer Handlungsaufforderung", durationSec: cta },
  ];
}

/**
 * Fully local, deterministic fallback — works with zero API keys. Produces
 * complete UGC scripts covering the full structure the studio requires.
 */
export class TemplateScriptProvider implements ScriptProvider {
  readonly key = "template";
  readonly mode = "MOCK" as const;

  async generate(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    const hookBuilder = HOOK_TEMPLATES[request.hookType] ?? HOOK_TEMPLATES["Problem-Agitate-Solve"];
    const voice = TONE_VOICE[request.tone] ?? TONE_VOICE.Locker;
    const problem = request.problemSolved || "ein Problem, das die Zielgruppe täglich spürt";

    return {
      hook: hookBuilder(request),
      problem: `Die Zielgruppe (${request.audience}) kennt ${problem} nur zu gut — meistens ohne eine wirkliche Lösung.`,
      situation: `Typische Alltagssituation auf ${request.platform}, in der genau dieses Problem sichtbar wird.`,
      productIntro: `${request.productName} wird beiläufig eingeführt, nicht wie klassische Werbung.`,
      demonstration: `Kurze, klare Anwendung von ${request.productName} in Echtzeit — Fokus auf das Ergebnis, nicht auf Features.`,
      benefit: `Der spürbare Vorteil wird direkt im Video gezeigt, nicht nur behauptet. Tonalität: ${voice}.`,
      socialProof: "Kurzer Verweis auf Bewertungen, Ergebnisse oder eigene Erfahrung.",
      objectionHandling: "Der häufigste Einwand der Zielgruppe wird in einem Satz entkräftet.",
      cta: request.cta,
      onScreenText: "2-3 kurze Textüberlagerungen, synchron zum Hook und zur Demonstration.",
      bRollNotes: "Nahaufnahme Produkt, Detailaufnahme Anwendung, Reaction-Shot der Zielgruppe.",
      voiceover: "Optional, folgt dem gesprochenen Text 1:1 für Barrierefreiheit.",
      sceneList: sceneList(request.durationSec),
    };
  }
}

export const templateScriptProvider = new TemplateScriptProvider();
