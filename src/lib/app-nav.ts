import {
  LayoutDashboard,
  Radar,
  Link2,
  KanbanSquare,
  FileText,
  Quote,
  Clapperboard,
  Image as ImageIcon,
  Send,
  CalendarDays,
  LineChart,
  Wallet,
  Bot,
  Workflow,
  Activity,
  Wrench,
  GitBranch,
  ShieldCheck,
  BrainCircuit,
  ScrollText,
  Plug,
  Settings,
  type LucideIcon,
  FlaskConical,
  Lightbulb,
  Target,
  GitCompare,
  Upload,
  Factory,
  Users,
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
    items: [
      { href: "/app/dashboard", label: "CEO-Dashboard", icon: LayoutDashboard },
      { href: "/app/creator-cockpit", label: "Creator Cockpit", icon: Activity },
      { href: "/app/scale-control", label: "Scale Control", icon: ShieldCheck },
    ],
  },
  {
    title: "Affiliate & Produkte",
    items: [
      { href: "/app/affiliate-programs", label: "Affiliate-Programme", icon: Link2 },
      { href: "/app/affiliate-links", label: "Affiliate-Links", icon: Link2 },
      { href: "/app/products", label: "Produkt-Radar", icon: Radar },
      { href: "/app/campaigns", label: "Kampagnen", icon: KanbanSquare },
    ],
  },
  {
    title: "Content Studio",
    items: [
      { href: "/app/content", label: "Übersicht", icon: FileText },
      { href: "/app/content/briefs", label: "Briefs", icon: FileText },
      { href: "/app/content/hooks", label: "Hooks", icon: Quote },
      { href: "/app/scripts", label: "Skripte", icon: FileText },
      { href: "/app/media", label: "Assets", icon: ImageIcon },
    ],
  },
  {
    title: "Medienjobs",
    items: [{ href: "/app/videos", label: "Video-Generator", icon: Clapperboard }],
  },
  {
    title: "Agenten",
    items: [
      { href: "/app/agents", label: "Registry", icon: Bot },
      { href: "/app/agent-runs", label: "Runs", icon: Activity },
      { href: "/app/agents/tools", label: "Tool Governance", icon: Wrench },
    ],
  },
  {
    title: "Workflows",
    items: [
      { href: "/app/workflows", label: "Definitionen", icon: Workflow },
      { href: "/app/workflow-runs", label: "Runs", icon: GitBranch },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/app/approvals", label: "Freigaben", icon: ShieldCheck },
      { href: "/app/budgets", label: "Budgets", icon: Wallet },
      { href: "/app/agent-memory", label: "Memory", icon: BrainCircuit },
      { href: "/app/audit", label: "Audit", icon: ScrollText },
    ],
  },
  {
    title: "Publishing & Analyse",
    items: [
      { href: "/app/publishing", label: "Social-Publishing", icon: Send },
      { href: "/app/calendar", label: "Content-Kalender", icon: CalendarDays },
      { href: "/app/analytics", label: "Analytics", icon: LineChart },
      { href: "/app/finance", label: "Finance", icon: Wallet },
    ],
  },
  {
    title: "Intelligenz & Optimierung",
    items: [
      { href: "/app/experiments", label: "Experimente", icon: FlaskConical },
      { href: "/app/recommendations", label: "Empfehlungen", icon: Lightbulb },
      { href: "/app/content-intelligence", label: "Content-Intelligence", icon: BrainCircuit },
      { href: "/app/optimization", label: "Optimierungsrichtlinien", icon: Workflow },
    ],
  },
  {
    title: "Produkt-Intelligenz",
    items: [
      { href: "/app/intelligence/discovery", label: "Produkt-Discovery", icon: Radar },
      { href: "/app/intelligence/catalog", label: "Produkt-Katalog", icon: KanbanSquare },
      { href: "/app/intelligence/opportunities", label: "Opportunity-Board", icon: Target },
      { href: "/app/intelligence/matches", label: "Match-Review", icon: GitCompare },
      { href: "/app/intelligence/import", label: "Import-Center", icon: Upload },
    ],
  },
  {
    title: "Kampagnen-Fabrik",
    items: [
      { href: "/app/campaign-factory", label: "Candidates", icon: Factory },
      { href: "/app/campaign-factory/strategies", label: "Strategien", icon: Target },
      { href: "/app/campaign-factory/audiences", label: "Zielgruppen", icon: Users },
      { href: "/app/creative-operations", label: "Creative Studio", icon: BrainCircuit },
      { href: "/app/content-batches", label: "Content Batches", icon: KanbanSquare },
      { href: "/app/production", label: "Production Board", icon: Wrench },
      { href: "/app/campaign-quality", label: "Quality", icon: ShieldCheck },
      { href: "/app/campaign-costs", label: "Kosten", icon: Wallet },
      { href: "/app/production-capacity", label: "Kapazität", icon: Activity },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/app/integrations", label: "Integrationen", icon: Plug },
      { href: "/app/settings", label: "Einstellungen", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
