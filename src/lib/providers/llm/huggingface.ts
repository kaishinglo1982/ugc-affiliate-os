/**
 * HuggingFace model catalog for the UGC Script Studio.
 * Shared between the server page (config load) and the client UI (selection).
 */

export interface HuggingFaceModel {
  /** Value stored in Integration.config.model */
  modelId: string;
  name: string;
  /** Short label used in the selection list */
  label: string;
  /** Visual theme hint (violet / cyan / orange) */
  tone: "violet" | "cyan" | "orange";
  /** What this model is best at */
  strengths: string;
  /** Typical use case in this app */
  useCase: string;
  /** Example prompt that works well with the model */
  examplePrompt: string;
  /** Rough context/quality hint */
  note: string;
}

export const HUGGINGFACE_MODELS: HuggingFaceModel[] = [
  {
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    name: "Llama 3.1 8B Instruct",
    label: "Llama 3.1 8B",
    tone: "violet",
    strengths: "Ausgewogenes Verhältnis aus Qualität, Tempo und Kosten.",
    useCase: "Allrounder für UGC-Skripte, Hooks und CTA-Varianten.",
    examplePrompt:
      "Schreibe einen 30-Sekunden-UGC-Hook für ein Schönheitsprodukt. Zielgruppe 18-34, Ton locker, Problem-Agitate-Solve.",
    note: "Gute Standardwahl, versteht deutsche Prompts zuverlässig.",
  },
  {
    modelId: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen 2.5 7B Instruct",
    label: "Qwen 2.5 7B",
    tone: "cyan",
    strengths: "Stark in kreativem Schreiben und Listenformaten.",
    useCase: "Hook-Varianten, Top-5-Rankings, Skript-Umschreibungen.",
    examplePrompt:
      "Erstelle 5 alternative Hooks für ein Affiliate-Video zu Küchenhelfern. Jeder Hook max. 12 Wörter.",
    note: "Besonders flink auf Serverless-Inference.",
  },
  {
    modelId: "google/gemma-2-2b-it",
    name: "Gemma 2 2B Instruct",
    label: "Gemma 2 2B",
    tone: "orange",
    strengths: "Sehr günstig und schnell, gut für einfache Texte.",
    useCase: "Massenproduktion von CTA-Zeilen und Kurzbeschreibungen.",
    examplePrompt: "Nenne 3 CTA-Varianten für einen Affiliate-Link zu einem Fitnessgerät.",
    note: "Klein und schnell – ideal für kostenbewusste Volumen-Produktion.",
  },
];

/** Integration config persisted per provider key. */
export interface HuggingFaceConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  autoSuggestHooks: boolean;
}

export const DEFAULT_HUGGINGFACE_CONFIG: HuggingFaceConfig = {
  model: HUGGINGFACE_MODELS[0].modelId,
  temperature: 0.7,
  maxTokens: 1024,
  autoSuggestHooks: true,
};

/** Tips shown in the interactive help accordion. */
export const HUGGINGFACE_TIPS: { title: string; body: string }[] = [
  {
    title: "API-Key erstellen (huggingface.co)",
    body: "Kostenlosen Account anlegen, dann auf Settings → Access Tokens einen neuen Token vom Typ Read oder Fine-grained erstellen. Der Key beginnt mit hf_ und wird hier serverseitig AES-256-GCM-verschlüsselt gespeichert.",
  },
  {
    title: "Modell wählen",
    body: "Llama 3.1 8B ist der empfohlene Allrounder. Qwen 2.5 schreibt kreativer, Gemma 2 2B ist am günstigsten. Du kannst jederzeit wechseln – bestehende Skripte bleiben unberührt.",
  },
  {
    title: "Kosten einordnen",
    body: "Serverless Inference zahlt nur pro Anfrage. Kleinere Modelle (2B) kosten nur einen Bruchteil und sind für einfache CTA- und Beschreibungs-Texte völlig ausreichend.",
  },
  {
    title: "Fallback-Verhalten",
    body: "Solange kein Key hinterlegt ist, generiert das Script Studio automatisch über den lokalen Template-Generator – kostenlos und ohne externe Anrufe.",
  },
];
