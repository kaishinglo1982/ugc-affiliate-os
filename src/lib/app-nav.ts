import {
  LayoutDashboard,
  Radar,
  Link2,
  KanbanSquare,
  FileText,
  Clapperboard,
  Image as ImageIcon,
  Send,
  CalendarDays,
  LineChart,
  Wallet,
  Bot,
  Workflow,
  Plug,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Übersicht",
    items: [{ href: "/app/dashboard", label: "CEO-Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Recherche & Kampagnen",
    items: [
      { href: "/app/products", label: "Produkt-Radar", icon: Radar },
      { href: "/app/affiliate-programs", label: "Affiliate-Programme", icon: Link2 },
      { href: "/app/affiliate-links", label: "Affiliate-Links", icon: Link2 },
      { href: "/app/campaigns", label: "Kampagnen", icon: KanbanSquare },
    ],
  },
  {
    title: "Content-Studio",
    items: [
      { href: "/app/scripts", label: "UGC-Skriptgenerator", icon: FileText },
      { href: "/app/videos", label: "Video-Generator", icon: Clapperboard },
      { href: "/app/media", label: "Medienbibliothek", icon: ImageIcon },
    ],
  },
  {
    title: "Publishing",
    items: [
      { href: "/app/publishing", label: "Social-Publishing", icon: Send },
      { href: "/app/calendar", label: "Content-Kalender", icon: CalendarDays },
    ],
  },
  {
    title: "Analyse & Finanzen",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: LineChart },
      { href: "/app/finance", label: "Finance", icon: Wallet },
    ],
  },
  {
    title: "Automatisierung",
    items: [
      { href: "/app/agents", label: "Agenten-Zentrale", icon: Bot },
      { href: "/app/automations", label: "Automationen", icon: Workflow },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/app/integrations", label: "Integrationen", icon: Plug },
      { href: "/app/settings", label: "Einstellungen", icon: Settings },
      { href: "/app/audit-log", label: "Audit-Log", icon: ScrollText },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
