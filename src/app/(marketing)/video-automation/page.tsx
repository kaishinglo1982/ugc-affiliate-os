import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Mic, User, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "Video-Automation",
  description: "Skript-, Avatar-, Voice- und Video-Workflow im Detail.",
};

const STAGES = [
  {
    icon: FileText,
    title: "Skript",
    description:
      "Hook, Problem, Demonstration, Social Proof, Einwandbehandlung, CTA — strukturiert und versioniert im Skript-Studio.",
  },
  {
    icon: User,
    title: "Avatar",
    description:
      "Auswahl von Avatar-Stil je Video-Job; Provider-Anbindung vorbereitet für HeyGen und weitere Anbieter.",
  },
  {
    icon: Mic,
    title: "Voice",
    description:
      "Sprache und Stimme pro Job konfigurierbar; ElevenLabs als vorbereiteter Voice-Provider.",
  },
  {
    icon: Video,
    title: "Video",
    description:
      "Format, Seitenverhältnis, Dauer, Untertitel und Musik final zusammengeführt zum Renderauftrag.",
  },
];

export default function VideoAutomationPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Video-Studio"
        title="Ein Job-Lifecycle, der wirklich durchläuft"
        description="Vom Skript bis zum fertigen Clip — inklusive Fortschritt, Fehlerfällen, Retry und Freigabe."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage) => (
              <StaggerItem key={stage.title}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-violet-soft)]">
                      <stage.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{stage.title}</CardTitle>
                    <CardDescription>{stage.description}</CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>

          <Reveal delay={0.1} className="mt-14">
            <h2 className="text-2xl font-semibold">Job-Status im Detail</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["QUEUED", "PROCESSING", "REVIEW_REQUIRED", "COMPLETED", "FAILED", "CANCELLED"].map(
                (status) => (
                  <span
                    key={status}
                    className="rounded-full border border-[var(--color-border-strong)] px-3 py-1 font-mono text-xs text-[var(--color-foreground-muted)]"
                  >
                    {status}
                  </span>
                ),
              )}
            </div>
            <p className="mt-4 max-w-2xl text-sm text-[var(--color-foreground-muted)]">
              Ohne hinterlegte Provider-Zugangsdaten übernimmt automatisch ein lokaler
              Mock-Provider den kompletten Ablauf — inklusive realistischer Verarbeitungszeit,
              Fortschrittsanzeige und einem lokalen Demo-Ergebnis. So lässt sich der gesamte
              Workflow testen, bevor echte Rendering-Kosten anfallen.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
