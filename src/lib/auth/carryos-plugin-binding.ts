import "server-only";
import { prisma } from "@/lib/db/client";

export class CarryOsPluginBindingError extends Error {}

export async function requireCarryOsUgcBinding(input: { tenantId: string; workspaceId: string }) {
  const binding = await prisma.carryOsPluginBinding.findFirst({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, status: "ACTIVE", revokedAt: null },
    select: { pluginInstallationId: true, servicePrincipalId: true, contractVersion: true },
  });
  if (!binding) throw new CarryOsPluginBindingError("CARRYOS_UGC_PLUGIN_BINDING_NOT_ACTIVE");
  return binding;
}
