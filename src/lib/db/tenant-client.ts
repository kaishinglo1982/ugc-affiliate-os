import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/client";

type AnyFunction = (...args: unknown[]) => unknown;

async function runTenantModelOperation(
  modelKey: PropertyKey,
  operationKey: PropertyKey,
  args: unknown[],
  workspaceIdOverride?: string,
): Promise<unknown> {
  if (process.env.NODE_ENV === "test" && typeof prisma.$transaction !== "function") {
    const model = Reflect.get(prisma as unknown as object, modelKey) as object | undefined;
    const operation = model ? Reflect.get(model, operationKey) : undefined;
    if (typeof operation !== "function") {
      throw new Error(`TENANT_PRISMA_OPERATION_NOT_AVAILABLE: ${String(modelKey)}.${String(operationKey)}`);
    }
    return Reflect.apply(operation as AnyFunction, model, args);
  }

  const workspaceId = workspaceIdOverride ?? (await resolveWorkspaceId());

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;

    const model = Reflect.get(tx as unknown as object, modelKey) as object | undefined;
    const operation = model ? Reflect.get(model, operationKey) : undefined;
    if (typeof operation !== "function") {
      throw new Error(`TENANT_PRISMA_OPERATION_NOT_AVAILABLE: ${String(modelKey)}.${String(operationKey)}`);
    }

    return Reflect.apply(operation as AnyFunction, model, args);
  });
}

function createTenantPrismaProxy(workspaceIdOverride?: string): PrismaClient {
  const modelProxyCache = new Map<PropertyKey, object>();

  const proxy = new Proxy(prisma as unknown as object, {
    get(target, modelKey, receiver) {
      if (typeof modelKey === "symbol") {
        return Reflect.get(target, modelKey, receiver);
      }

      if (modelKey === "$transaction") {
        return async (callback: unknown) => {
          if (typeof callback !== "function") {
            throw new Error(
              "TENANT_PRISMA_TRANSACTION_CALLBACK_REQUIRED: array transactions are not tenant-safe",
            );
          }

          const workspaceId = workspaceIdOverride ?? (await resolveWorkspaceId());
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
            return Reflect.apply(callback as AnyFunction, undefined, [tx]);
          });
        };
      }

      if (modelKey.startsWith("$")) {
        throw new Error(
          `TENANT_PRISMA_CLIENT_OPERATION_FORBIDDEN: ${modelKey}. Raw/client operations require an explicit workspace-safe helper.`,
        );
      }

      const directModel = Reflect.get(target, modelKey, receiver);
      if (
        (typeof directModel !== "object" || directModel === null) &&
        typeof directModel !== "function"
      ) {
        return directModel;
      }

      const cached = modelProxyCache.get(modelKey);
      if (cached) return cached;

      const modelProxy = new Proxy(directModel as object, {
        get(modelTarget, operationKey, modelReceiver) {
          const member = Reflect.get(modelTarget, operationKey, modelReceiver);
          if (typeof member !== "function") return member;

          return (...args: unknown[]) =>
            runTenantModelOperation(modelKey, operationKey, args, workspaceIdOverride);
        },
      });

      modelProxyCache.set(modelKey, modelProxy);
      return modelProxy;
    },
  });

  return proxy as unknown as PrismaClient;
}

/**
 * Compatibility adapter for request-bound legacy tenant-owned Prisma calls.
 *
 * Every model operation executes in its own transaction with the active
 * workspace bound through transaction-local app.workspace_id. New code should
 * prefer withWorkspaceDb() when multiple operations must share one atomic
 * transaction.
 */
export const tenantPrisma = createTenantPrismaProxy();

/**
 * Internal adapter for trusted service/worker code that already resolved an
 * authenticated workspace id. Never pass caller-controlled workspace ids here.
 */
export function tenantPrismaForWorkspace(workspaceId: string): PrismaClient {
  if (!workspaceId.trim()) {
    throw new Error("TENANT_PRISMA_WORKSPACE_ID_REQUIRED");
  }
  return createTenantPrismaProxy(workspaceId);
}
