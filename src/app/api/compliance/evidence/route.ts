import { created, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import { complianceEvidenceSchema } from "@/lib/validation/phase23-30";
import { addComplianceEvidence } from "@/server/services/phase23-30";

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, complianceEvidenceSchema);
  if ("response" in parsed) return parsed.response;
  const evidence = await addComplianceEvidence(
    auth.context.workspaceId,
    auth.context.actor,
    parsed.data,
  );
  await writeAuditLog({
    action: "compliance.evidence_add",
    entityType: "ComplianceEvidence",
    entityId: evidence.id,
    actor: auth.context.actor,
    workspaceId: auth.context.workspaceId,
    metadata: {
      entityType: evidence.entityType,
      entityId: evidence.entityId,
      evidenceKind: evidence.evidenceKind,
    },
  });
  return created({ evidence });
}
