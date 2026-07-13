import Link from "next/link";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Produkt",
    links: [
      { href: "/features", label: "Features" },
      { href: "/workflow", label: "Workflow" },
      { href: "/integrations", label: "Integrationen" },
      { href: "/app/dashboard", label: "Dashboard öffnen" },
    ],
  },
  {
    title: "System",
    links: [
      { href: "/product-research", label: "Produktrecherche" },
      { href: "/video-automation", label: "Video-Automation" },
      { href: "/affiliate-networks", label: "Affiliate-Netzwerke" },
      { href: "/about", label: "Über das Projekt" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/nutzungsbedingungen", label: "Nutzungsbedingungen" },
      { href: "/contact", label: "Kontakt" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-(--container-content) px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <span className="font-semibold">UGC Affiliate OS</span>
            <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
              Persönliches Betriebssystem für Produktrecherche, UGC-Content und
              Affiliate-Operations.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-foreground-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} UGC Affiliate OS. Einzelbetreiber-Projekt.</span>
          <span>Single-User Edition — keine öffentliche Registrierung.</span>
        </div>
      </div>
    </footer>
  );
}
