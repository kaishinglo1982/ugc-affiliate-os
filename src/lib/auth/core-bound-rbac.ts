import { z } from "zod";
import type { Role } from "@/lib/auth/rbac";

const workspaceIdSchema = z.string().uuid();
const userIdSchema = z.string().uuid();
const roleSchema = z.enum([
  "viewer",
  "analyst",
  "affiliate_manager",
  "content_manager",
  "publisher",
  "finance_viewer",
  "admin",
  "owner",
]);
const roleBindingsSchema = z.record(
  workspaceIdSchema,
  z.record(userIdSchema, roleSchema),
);

export class CoreBoundRoleBindingError extends Error {}

function workspaceRoleBindings(): Readonly<Record<string, Readonly<Record<string, Role>>>> {
  const raw = process.env.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON?.trim();
  if (!raw) {
    throw new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDINGS_NOT_CONFIGURED");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID");
  }

  const parsed = roleBindingsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDINGS_INVALID");
  }

  return parsed.data;
}

/**
 * Resolve the local UGC role for one authenticated user inside one workspace.
 * CORE_BOUND authorization is deliberately fail-closed: no binding means no
 * implicit owner/admin privileges.
 */
export function resolveCoreBoundRole(workspaceId: string, userId: string): Role {
  const parsedWorkspaceId = workspaceIdSchema.safeParse(workspaceId);
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedWorkspaceId.success || !parsedUserId.success) {
    throw new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDING_SUBJECT_INVALID");
  }

  const role = workspaceRoleBindings()[parsedWorkspaceId.data]?.[parsedUserId.data];
  if (!role) {
    throw new CoreBoundRoleBindingError("CARRYOS_WORKSPACE_ROLE_BINDING_NOT_CONFIGURED");
  }
  return role;
}
