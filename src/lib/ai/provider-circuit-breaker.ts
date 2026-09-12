export type ProviderCircuitState = "closed" | "open" | "half-open";

export interface ProviderCircuitSnapshot {
  providerId: string;
  workspaceId: string;
  state: ProviderCircuitState;
  failures: number;
  openedAt?: string;
  manuallyDisabled: boolean;
  reason?: string;
}

export class ProviderCircuitOpenError extends Error {
  constructor(providerId: string) {
    super(`Provider circuit is open: ${providerId}`);
    this.name = "ProviderCircuitOpenError";
  }
}

export class ProviderCircuitBreaker {
  private readonly snapshots = new Map<string, ProviderCircuitSnapshot>();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60_000,
  ) {
    if (!Number.isInteger(failureThreshold) || failureThreshold < 1) {
      throw new Error("failureThreshold must be a positive integer");
    }
    if (!Number.isInteger(cooldownMs) || cooldownMs < 1) {
      throw new Error("cooldownMs must be a positive integer");
    }
  }

  private key(workspaceId: string, providerId: string): string {
    if (!workspaceId || !providerId) {
      throw new Error("workspaceId and providerId are required");
    }
    return `${workspaceId}:${providerId}`;
  }

  snapshot(workspaceId: string, providerId: string): ProviderCircuitSnapshot {
    return (
      this.snapshots.get(this.key(workspaceId, providerId)) ?? {
        providerId,
        workspaceId,
        state: "closed",
        failures: 0,
        manuallyDisabled: false,
      }
    );
  }

  beforeRequest(
    workspaceId: string,
    providerId: string,
    now = new Date(),
  ): ProviderCircuitSnapshot {
    const current = this.snapshot(workspaceId, providerId);
    if (current.manuallyDisabled) {
      throw new ProviderCircuitOpenError(providerId);
    }

    if (current.state !== "open") {
      return current;
    }

    const elapsed = current.openedAt
      ? now.getTime() - new Date(current.openedAt).getTime()
      : 0;
    if (elapsed < this.cooldownMs) {
      throw new ProviderCircuitOpenError(providerId);
    }

    const next = { ...current, state: "half-open" as const };
    this.snapshots.set(this.key(workspaceId, providerId), next);
    return next;
  }

  recordSuccess(workspaceId: string, providerId: string): ProviderCircuitSnapshot {
    const next: ProviderCircuitSnapshot = {
      providerId,
      workspaceId,
      state: "closed",
      failures: 0,
      manuallyDisabled: false,
    };
    this.snapshots.set(this.key(workspaceId, providerId), next);
    return next;
  }

  recordFailure(
    workspaceId: string,
    providerId: string,
    reason: string,
    now = new Date(),
  ): ProviderCircuitSnapshot {
    const current = this.snapshot(workspaceId, providerId);
    const failures = current.failures + 1;
    const opened = failures >= this.failureThreshold;
    const next: ProviderCircuitSnapshot = {
      providerId,
      workspaceId,
      state: opened ? "open" : current.state,
      failures,
      manuallyDisabled: current.manuallyDisabled,
      reason,
      ...(opened ? { openedAt: now.toISOString() } : {}),
    };
    this.snapshots.set(this.key(workspaceId, providerId), next);
    return next;
  }

  disable(
    workspaceId: string,
    providerId: string,
    reason: string,
  ): ProviderCircuitSnapshot {
    const next: ProviderCircuitSnapshot = {
      ...this.snapshot(workspaceId, providerId),
      state: "open",
      manuallyDisabled: true,
      reason,
    };
    this.snapshots.set(this.key(workspaceId, providerId), next);
    return next;
  }

  enable(workspaceId: string, providerId: string): ProviderCircuitSnapshot {
    const next: ProviderCircuitSnapshot = {
      providerId,
      workspaceId,
      state: "half-open",
      failures: 0,
      manuallyDisabled: false,
    };
    this.snapshots.set(this.key(workspaceId, providerId), next);
    return next;
  }
}
