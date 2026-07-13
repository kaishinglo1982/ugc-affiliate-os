import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Affiliate-Netzwerke",
  description: "Übersicht über unterstützte und vorbereitete Affiliate-Netzwerke.",
};

const NETWORKS = [
  { name: "Amazon Associates", note: "Weltweit größtes Partnerprogramm, breite Produktabdeckung." },
  { name: "eBay Partner Network", note: "Provisionen für Auktions- und Sofortkauf-Angebote." },
  { name: "Awin", note: "Europäisches Affiliate-Netzwerk mit breitem Advertiser-Portfolio." },
  { name: "CJ Affiliate", note: "Etabliertes US-Netzwerk mit großen Markenprogrammen." },
  { name: "Impact", note: "Partnerschafts-Management für Marken und Creator." },
  { name: "Rakuten Advertising", note: "Globales Netzwerk mit Fokus auf Fashion und Lifestyle." },
  { name: "ShareASale", note: "Breites Netzwerk für Nischen- und Mittelstandsmarken." },
  { name: "Digistore24", note: "Digitale Produkte mit teils sehr hohen Provisionssätzen." },
  { name: "Adcell", note: "Deutschsprachiges Netzwerk mit lokalen Advertisern." },
  { name: "Benutzerdefiniert", note: "Eigene Programme mit individuellem Tracking-Link-Format." },
];

export default function AffiliateNetworksPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Affiliate-Netzwerke"
        title="Vorbereitete Programme für den direkten Start"
        description="Jedes Netzwerk lässt sich als Programm anlegen — mit Tracking-ID, Zugangsdatenstatus und Link-Generierung."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NETWORKS.map((network) => (
              <StaggerItem key={network.name}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{network.name}</CardTitle>
                      <Badge variant="outline">Vorbereitet</Badge>
                    </div>
                    <CardDescription>{network.note}</CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>
    </>
  );
}
