export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  RESEARCH: "Recherche",
  SCRIPTING: "Skripting",
  PRODUCTION: "Produktion",
  REVIEW: "Review",
  SCHEDULED: "Geplant",
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
  ARCHIVED: "Archiviert",
};

export const SCRIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  APPROVED: "Freigegeben",
  ARCHIVED: "Archiviert",
};

export const VIDEO_JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Warteschlange",
  PROCESSING: "In Bearbeitung",
  REVIEW_REQUIRED: "Review nötig",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
  CANCELLED: "Abgebrochen",
};

export const SOCIAL_POST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  READY: "Bereit",
  APPROVED: "Freigegeben",
  SCHEDULED: "Geplant",
  PUBLISHING: "Wird veröffentlicht",
  PUBLISHED: "Veröffentlicht",
  FAILED: "Fehlgeschlagen",
  CANCELLED: "Abgebrochen",
};

export const AGENT_STATUS_LABELS: Record<string, string> = {
  IDLE: "Bereit",
  RUNNING: "Läuft",
  PAUSED: "Pausiert",
  ERROR: "Fehler",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DISCOVERED: "Entdeckt",
  UNDER_REVIEW: "In Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Verworfen",
  PAUSED: "Pausiert",
  UNAVAILABLE: "Nicht verfügbar",
  ARCHIVED: "Archiviert",
};

export const TREND_STATUS_LABELS: Record<string, string> = {
  EMERGING: "Aufkommend",
  GROWING: "Wachsend",
  STABLE: "Stabil",
  DECLINING: "Rückläufig",
  SATURATED: "Gesättigt",
};

export const RISK_LABELS: Record<string, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
  CRITICAL: "Kritisch",
};

export const INTEGRATION_MODE_LABELS: Record<string, string> = {
  LIVE: "Live",
  SANDBOX: "Sandbox",
  MOCK: "Mock",
};

export const AFFILIATE_PROVIDER_LABELS: Record<string, string> = {
  AMAZON_ASSOCIATES: "Amazon Associates",
  EBAY_PARTNER_NETWORK: "eBay Partner Network",
  AWIN: "Awin",
  CJ_AFFILIATE: "CJ Affiliate",
  IMPACT: "Impact",
  RAKUTEN_ADVERTISING: "Rakuten Advertising",
  SHAREASALE: "ShareASale",
  DIGISTORE24: "Digistore24",
  ADCELL: "Adcell",
  CUSTOM: "Benutzerdefiniert",
};

export const REVENUE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  CONFIRMED: "Bestätigt",
  PAID: "Ausgezahlt",
  REVERSED: "Storniert",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  TOOLS_SOFTWARE: "Tools & Software",
  ADVERTISING: "Werbung",
  AI_CREDITS: "KI-Credits",
  VIDEO_PRODUCTION: "Videoproduktion",
  STOCK_MEDIA: "Stock-Media",
  SUBSCRIPTIONS: "Abonnements",
  FREELANCE: "Freelancer",
  HARDWARE: "Hardware",
  OFFICE: "Büro",
  TAXES_FEES: "Steuern & Gebühren",
  OTHER: "Sonstiges",
};

export const CONTENT_BRIEF_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  APPROVED: "Freigegeben",
  ARCHIVED: "Archiviert",
};

export const CONTENT_HOOK_STATUS_LABELS: Record<string, string> = {
  IDEA: "Idee",
  DRAFT: "Entwurf",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
};

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  ARCHIVED: "Archiviert",
};

export const WORKFLOW_RUN_STATUS_LABELS: Record<string, string> = {
  RUNNING: "Läuft",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
  CANCELLED: "Abgebrochen",
};

export const AGENT_TOOL_RISK_LABELS: Record<string, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};

export const AGENT_MEMORY_TYPE_LABELS: Record<string, string> = {
  FACT: "Fakt",
  PREFERENCE: "Präferenz",
  CONTEXT: "Kontext",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING: "Offen",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

export const APPROVAL_RESOURCE_LABELS: Record<string, string> = {
  product: "Produkt",
  affiliate_offer: "Affiliate-Offer",
  product_opportunity: "Opportunity",
  product_campaign_candidate: "Kampagnen-Kandidat",
};

export const COST_RESERVATION_STATUS_LABELS: Record<string, string> = {
  RESERVED: "Reserviert",
  CONSUMED: "Verbraucht",
  RELEASED: "Freigegeben",
  EXPIRED: "Abgelaufen",
};

export const BUDGET_PERIOD_LABELS: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

export const BUDGET_ACTION_LABELS: Record<string, string> = {
  alert: "Warnung",
  block: "Hard Stop",
};

export const CAMPAIGN_CANDIDATE_STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  under_review: "In Prüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
  converted: "Konvertiert",
};

export const CAMPAIGN_STRATEGY_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  under_review: "In Prüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  superseded: "Ersetzt",
  archived: "Archiviert",
};

export const CAMPAIGN_AUDIENCE_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  archived: "Archiviert",
};

export const CREATIVE_ANGLE_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  archived: "Archiviert",
};

export const CREATIVE_ANGLE_TYPE_LABELS: Record<string, string> = {
  problem_solution: "Problem → Lösung",
  product_demo: "Produktdemo",
  comparison: "Vergleich",
  testimonial: "Testimonial",
  before_after: "Vorher/Nachher",
  tutorial: "Tutorial",
  review: "Review",
  unboxing: "Unboxing",
  listicle: "Liste",
  story: "Story",
  authority: "Autorität",
  contrarian: "Konträr",
  urgency: "Dringlichkeit",
  benefit: "Nutzen",
  faq: "FAQ",
  myth_busting: "Mythos-Entlarvung",
};

export const CONTENT_BATCH_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  planning: "Planung",
  awaiting_approval: "Wartet auf Freigabe",
  approved: "Freigegeben",
  in_production: "In Produktion",
  quality_review: "Qualitätsprüfung",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
};

export const CONTENT_BATCH_ITEM_STATUS_LABELS: Record<string, string> = {
  planned: "Geplant",
  brief_ready: "Brief bereit",
  hook_ready: "Hook bereit",
  script_ready: "Script bereit",
  production_ready: "Produktionsbereit",
  in_production: "In Produktion",
  quality_review: "Qualitätsprüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  failed: "Fehlgeschlagen",
};

export const PRODUCTION_TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  ready: "Bereit",
  in_progress: "Läuft",
  waiting_for_approval: "Wartet auf Freigabe",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
  skipped: "Übersprungen",
};

export const PRODUCTION_TASK_TYPE_LABELS: Record<string, string> = {
  research_validation: "Recherche/Validierung",
  brief_creation: "Brief-Erstellung",
  hook_creation: "Hook-Erstellung",
  script_creation: "Script-Erstellung",
  caption_creation: "Caption-Erstellung",
  cta_creation: "CTA-Erstellung",
  disclosure_validation: "Disclosure-Prüfung",
  visual_planning: "Visual-Planung",
  voice_planning: "Voice-Planung",
  media_generation: "Medien-Generierung",
  editing: "Schnitt",
  subtitle_creation: "Untertitel",
  thumbnail_creation: "Thumbnail",
  quality_assurance: "Qualitätssicherung",
  compliance_review: "Compliance-Review",
  final_approval: "Finale Freigabe",
  publishing_preparation: "Publishing-Vorbereitung",
};

export const FACTORY_RUN_STATUS_LABELS: Record<string, string> = {
  queued: "Warteschlange",
  running: "Läuft",
  waiting_for_approval: "Wartet auf Freigabe",
  completed: "Abgeschlossen",
  partially_completed: "Teilweise abgeschlossen",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
};

export const QUALITY_REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  passed: "Bestanden",
  failed: "Fehlgeschlagen",
  manual_review: "Manuelles Review",
};
