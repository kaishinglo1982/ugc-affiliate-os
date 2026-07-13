"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { contactSchema } from "@/lib/validation/contact";
import { isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";
import { fail, ok, newRequestId, type Result } from "@/types/result";

export async function submitContactAction(
  _prevState: Result<{ submitted: true }> | null,
  formData: FormData,
): Promise<Result<{ submitted: true }>> {
  const requestId = newRequestId();
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (isRateLimited(`contact:${ip}`)) {
    return fail(
      "Zu viele Anfragen von deiner Verbindung. Bitte versuche es später erneut.",
      requestId,
    );
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    company: formData.get("company") ?? "",
  });

  recordAttempt(`contact:${ip}`);

  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.company) {
    // Honeypot tripped — behave as if it succeeded, but write nothing.
    return ok({ submitted: true }, requestId);
  }

  const request = await prisma.contactRequest.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });

  await writeAuditLog({
    action: "contact.submitted",
    entityType: "ContactRequest",
    entityId: request.id,
    requestId,
    actor: "visitor",
  });

  return ok({ submitted: true }, requestId);
}
