import {
  PackagePlus,
  KanbanSquare,
  FileText,
  Clapperboard,
  Send,
  Coins,
  Receipt,
  Plug,
  type LucideIcon,
} from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
}

/** Command Palette + Quick Create menu — every entry must resolve to a real,
 * working route (master prompt §7: Command Palette must cover Produkt
 * hinzufügen, Kampagne erstellen, Skript erstellen, Videoauftrag starten,
 * Veröffentlichung planen, Einnahme erfassen, Ausgabe erfassen, Integration
 * öffnen). */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: "product", label: "Produkt hinzufügen", href: "/app/products/create", icon: PackagePlus },
  { id: "campaign", label: "Kampagne erstellen", href: "/app/campaigns/create", icon: KanbanSquare },
  { id: "script", label: "Skript erstellen", href: "/app/scripts?create=1", icon: FileText },
  { id: "video", label: "Videoauftrag starten", href: "/app/videos/create", icon: Clapperboard },
  { id: "publish", label: "Veröffentlichung planen", href: "/app/publishing?create=1", icon: Send },
  { id: "revenue", label: "Einnahme erfassen", href: "/app/finance/income?create=1", icon: Coins },
  { id: "expense", label: "Ausgabe erfassen", href: "/app/finance/expenses?create=1", icon: Receipt },
  { id: "integration", label: "Integration öffnen", href: "/app/integrations", icon: Plug },
];
