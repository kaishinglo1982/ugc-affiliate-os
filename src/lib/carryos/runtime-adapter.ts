import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { resolveCarryOSTenantContext, type CarryOSTenantContext } from "@/lib/auth/tenant";
import { runAll } from "@/features/products/application/research-job";
import { scoreProductOpportunities } from "@/features/products/application/core";

export const CARRYOS_WORKFLOW_SCOPE = "carryos:workflow:execute" as const;

export const CARRYOS_RUNTIME_OPERATIONS = {
  "affiliate.research": "ugc:affiliate:research",
  "affiliate.opportunity.score": "ugc:opportunities:manage",
  "affiliate.opportunity.list": "ugc:opportunities:manage",
} as const;

export type CarryOSRuntimeOperation = keyof typeof CARRYOS_RUNTIME_OPERATIONS;

export class CarryOSRuntimeAuthorizationError extends Error {}
export class CarryOSRuntimeOperationError extends Error {}

export interface CarryOSRuntimeRequest {
  operation: CarryOSRuntimeOperation;
  productId?: string;
  correlationId?: string;
}

export interface CarryOSRuntimeResponse {
  operation: CarryOSRuntimeOperation;
  tenantId: string;
  workspaceId: string;
  correlationId: string;
  result: unknown;
}

function requireExecutionAuthorization(
  context: CarryOSTenantContext,
  operation: CarryOSRuntimeOperation,
): void {
  if (context.scope !== CARRYOS_WORKFLOW_SCOPE) {
    throw new CarryOSRuntimeAuthorizationError("CarryOS workflow execution scope is required");
  }

  const requiredCapability = CARRYOS_RUNTIME_OPERATIONS[operation];
  if (!context.capabilities.includes(requiredCapability)) {
    throw new CarryOSRuntimeAuthorizationError(
      `CarryOS capability is not granted: ${requiredCapability}`,
    );
  }
}

export async function executeCarryOSRuntime(
  request: CarryOSRuntimeRequest,
): Promise<CarryOSRuntimeResponse> {
  const context = await resolveCarryOSTenantContext();
  if (!context) {
    throw new CarryOSRuntimeAuthorizationError("CarryOS tenant token is required");
  }

  requireExecutionAuthorization(context, request.operation);

  const correlationId = request.correlationId ?? randomUUID();
  const actor = `carryos:${context.tenantId}`;

  switch (request.operation) {
    case "affiliate.research":
      return {
        operation: request.operation,
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        correlationId,
        result: await runAll(actor, correlationId, context.workspaceId),
      };

    case "affiliate.opportunity.score":
      return {
        operation: request.operation,
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        correlationId,
        result: await scoreProductOpportunities(
          request.productId ?? null,
          actor,
          context.workspaceId,
        ),
      };

    case "affiliate.opportunity.list":
      return {
        operation: request.operation,
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        correlationId,
        result: await prisma.productOpportunity.findMany({
          where: { workspaceId: context.workspaceId },
          orderBy: { calculatedAt: "desc" },
        }),
      };

    default: {
      const exhaustiveCheck: never = request.operation;
      throw new CarryOSRuntimeOperationError(
        `Unsupported CarryOS runtime operation: ${exhaustiveCheck}`,
      );
    }
  }
}
