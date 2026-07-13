import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "E-Mail wird benötigt").email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort wird benötigt"),
});

export type LoginInput = z.infer<typeof loginSchema>;
