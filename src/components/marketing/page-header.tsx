import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";

export function MarketingPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-[var(--color-border)] bg-grid-fade px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <Badge variant="primary" className="mb-4">
            {eyebrow}
          </Badge>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-lg text-[var(--color-foreground-muted)]">{description}</p>
      </Reveal>
    </section>
  );
}
