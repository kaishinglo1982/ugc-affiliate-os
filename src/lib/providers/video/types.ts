export interface VideoJobRequest {
  jobId: string;
  format: string;
  aspectRatio: string;
  durationSec: number;
  style?: string | null;
  avatar?: string | null;
  voice?: string | null;
  script?: {
    hook: string;
    sceneList: unknown;
  } | null;
  /** Mock-provider only: forces a specific outcome so the full job lifecycle
   * (including failure and manual-review paths) can be exercised deterministically
   * in the UI and in tests, without relying on chance. Ignored by real providers. */
  simulateOutcome?: "success" | "review" | "failure";
}

export type VideoJobProviderStatus =
  | "QUEUED"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface VideoJobProviderState {
  status: VideoJobProviderStatus;
  progress: number;
  resultUrl?: string;
  errorMessage?: string;
}

/**
 * Every video generation backend (Higgsfield, Runway, Kling, Veo, HeyGen,
 * ElevenLabs, custom) implements this interface. The UI never talks to a
 * vendor SDK directly — only to this contract — so swapping/adding a
 * provider never touches route or component code.
 */
export interface VideoProvider {
  readonly key: string;
  readonly mode: "LIVE" | "SANDBOX" | "MOCK";
  submit(request: VideoJobRequest): Promise<VideoJobProviderState>;
  poll(jobId: string): Promise<VideoJobProviderState>;
  cancel(jobId: string): Promise<void>;
}
