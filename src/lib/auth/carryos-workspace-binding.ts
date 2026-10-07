import { z } from "zod";

const tenantIdSchema = z.string().uuid();
const workspaceIdSchema = z.string().uuid();
const bindingsSchema = z.record(tenantIdSchema, workspaceIdSchema);

export class TenantWorkspaceBindingError extends Error {}

function readBindings(): Readonly<Record<string, string>> {
  const raw = process.env.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON?.trim();
  if (!raw) {
    throw new TenantWorkspaceBindingError(
      "CARRYOS_TENANT_WORKSPACE_BINDINGS_NOT_CONFIGURED",
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new TenantWorkspaceBindingError(
      "CARRYOS_TENANT_WORKSPACE_BINDINGS_INVALID",
    );
  }

  const parsed = bindingsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new TenantWorkspaceBindingError(
      "CARRYOS_TENANT_WORKSPACE_BINDINGS_INVALID",
    );
  }

  return parsed.data;
}

export function resolveWorkspaceIdForCarryOsTenant(
  tenantId: string,
): string {
  const parsedTenantId = tenantIdSchema.safeParse(tenantId);
  if (!parsedTenantId.success) {
    throw new TenantWorkspaceBindingError(
      "CARRYOS_TENANT_WORKSPACE_BINDING_SUBJECT_INVALID",
    );
  }

  const workspaceId = readBindings()[parsedTenantId.data];
  if (!workspaceId) {
    throw new TenantWorkspaceBindingError(
      "CARRYOS_TENANT_WORKSPACE_BINDING_NOT_CONFIGURED",
    );
  }

  return workspaceId;
}
