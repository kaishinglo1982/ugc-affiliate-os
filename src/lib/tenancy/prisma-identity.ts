import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export async function withPrismaIdentity<T>(
  prisma: PrismaClient,
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error("Authenticated user id is required.");

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_workspace_id', '', true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
    return work(tx);
  });
}
