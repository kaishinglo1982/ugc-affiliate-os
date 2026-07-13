import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(120),
  email: z.string().trim().min(1, "E-Mail wird benötigt").email("Ungültige E-Mail-Adresse"),
  subject: z.string().trim().min(3, "Bitte gib einen Betreff an.").max(160),
  message: z.string().trim().min(10, "Bitte beschreibe dein Anliegen etwas ausführlicher.").max(4000),
  /** Honeypot field — must stay empty. Bots that fill every field trip this. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
