import type { AgentTaskRequest } from "@/lib/agents/capability-registry";
import type { AgentCapacityReservation, PostgresAgentCapacityRouter } from "@/lib/agents/postgres-capacity-router";
import type { ClaimedWorkflowStep, PostgresWorkflowStepClaimService } from "@/lib/workflows/postgres-step-claim";

export interface DispatchedAgentStep {
  step: ClaimedWorkflowStep;
  capacity: AgentCapacityReservation;
}

export class AgentStepDispatchService {
  constructor(
    private readonly stepClaims: PostgresWorkflowStepClaimService,
    private readonly capacityRouter: PostgresAgentCapacityRouter,
  ) {}

  async claimAndRoute(input: {
    workspaceId: string;
    workerId: string;
    stepLeaseMs: number;
    capacityTtlMs: number;
    task: Omit<AgentTaskRequest, "workspaceId">;
    now?: Date;
  }): Promise<DispatchedAgentStep | null> {
    const step = await this.stepClaims.claimNext({
      workspaceId: input.workspaceId,
      workerId: input.workerId,
      leaseMs: input.stepLeaseMs,
      now: input.now,
    });
    if (!step) return null;

    try {
      const capacity = await this.capacityRouter.reserve({
        request: { workspaceId: input.workspaceId, ...input.task },
        workflowStepRunId: step.id,
        ttlMs: input.capacityTtlMs,
        now: input.now,
      });
      return { step, capacity };
    } catch (error) {
      // The claimed step is intentionally left to its short lease and normal
      // 10.3 recovery path. This avoids an unsafe direct state rewrite here.
      throw error;
    }
  }

  async releaseCapacity(input: {
    workspaceId: string;
    reservationToken: string;
    now?: Date;
  }): Promise<boolean> {
    return this.capacityRouter.release(input);
  }
}
