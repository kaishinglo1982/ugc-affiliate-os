import { created, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { audienceContactSchema } from "@/lib/validation/phase23-30";
import { createAudienceContact } from "@/server/services/phase23-30";

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, audienceContactSchema);
  if ("response" in parsed) return parsed.response;
  const contact = await createAudienceContact(auth.context.workspaceId, parsed.data);
  await writeAuditLog({
    action: "audience_contact.create",
    entityType: "AudienceContact",
    entityId: contact.id,
    actor: auth.context.actor,
    workspaceId: auth.context.workspaceId,
    metadata: {
      lawfulBasis: contact.lawfulBasis,
      marketingConsent: contact.marketingConsent,
    },
  });
  return created({
    contact: {
      id: contact.id,
      pseudonymousKey: contact.pseudonymousKey,
      displayName: contact.displayName,
      lawfulBasis: contact.lawfulBasis,
      marketingConsent: contact.marketingConsent,
      createdAt: contact.createdAt,
    },
  });
}
