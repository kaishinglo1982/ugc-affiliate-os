import type {
  VideoJobRequest,
  VideoJobProviderState,
  VideoProvider,
} from "@/lib/providers/video/types";

interface MockJobRecord {
  startedAt: number;
  simulateOutcome: "success" | "review" | "failure";
}

/**
 * Deterministic, fully local simulation of a video generation backend.
 * Drives QUEUED -> PROCESSING -> (COMPLETED | REVIEW_REQUIRED | FAILED)
 * purely from elapsed wall-clock time, so `poll()` can be called repeatedly
 * (e.g. by a client-side interval) and observe real progress without any
 * external network call or paid API usage.
 */
const registry = new Map<string, MockJobRecord>();

const QUEUE_MS = 1500;
const PROCESS_MS = 6000;

export class MockVideoProvider implements VideoProvider {
  readonly key = "mock";
  readonly mode = "MOCK" as const;

  async submit(request: VideoJobRequest): Promise<VideoJobProviderState> {
    registry.set(request.jobId, {
      startedAt: Date.now(),
      simulateOutcome: request.simulateOutcome ?? "success",
    });
    return { status: "QUEUED", progress: 0 };
  }

  async poll(jobId: string): Promise<VideoJobProviderState> {
    const record = registry.get(jobId);
    if (!record) {
      return { status: "FAILED", progress: 0, errorMessage: "Unbekannter Mock-Job." };
    }

    const elapsed = Date.now() - record.startedAt;

    if (elapsed < QUEUE_MS) {
      return { status: "QUEUED", progress: 0 };
    }

    if (elapsed < QUEUE_MS + PROCESS_MS) {
      const progress = Math.min(
        95,
        Math.round(((elapsed - QUEUE_MS) / PROCESS_MS) * 95),
      );
      return { status: "PROCESSING", progress };
    }

    switch (record.simulateOutcome) {
      case "failure":
        return {
          status: "FAILED",
          progress: 62,
          errorMessage:
            "Mock-Rendering fehlgeschlagen (simuliert): Anbieter meldete einen Timeout.",
        };
      case "review":
        return { status: "REVIEW_REQUIRED", progress: 100 };
      default:
        return {
          status: "COMPLETED",
          progress: 100,
          resultUrl: `/mock/video-result.svg?job=${encodeURIComponent(jobId)}`,
        };
    }
  }

  async cancel(jobId: string): Promise<void> {
    registry.delete(jobId);
  }
}

export const mockVideoProvider = new MockVideoProvider();
