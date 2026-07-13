import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Nimm Kontakt zum Betreiber des UGC Affiliate Operating Systems auf.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingPageHeader
        title="Kontakt"
        description="Fragen, Feedback oder Kooperationsanfragen — die Nachricht landet direkt in der Datenbank des Systems."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-xl">
          <ContactForm />
        </Reveal>
      </section>
    </>
  );
}
