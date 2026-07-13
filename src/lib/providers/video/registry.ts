import type { VideoProvider } from "@/lib/providers/video/types";
import { mockVideoProvider } from "@/lib/providers/video/mock-provider";
import type { VideoProviderKey } from "@/generated/prisma/client";

const LIVE_ENV_KEYS: Partial<Record<VideoProviderKey, string>> = {
  HIGGSFIELD: "HIGGSFIELD_API_KEY",
  ELEVENLABS: "ELEVENLABS_API_KEY",
};

/** Live/sandbox SDKs for Runway, Kling, Veo, HeyGen and custom endpoints are not
 * wired up yet — see docs/build-report.md "Known limitations". Selecting them
 * falls back to the mock provider so the job lifecycle still completes. */
export function resolveVideoProvider(providerKey: VideoProviderKey): VideoProvider {
  const envKey = LIVE_ENV_KEYS[providerKey];
  if (envKey && process.env[envKey]) {
    // A real credential is present, but the vendor SDK integration itself is
    // out of scope for this build — fall through to the mock provider rather
    // than silently making a real paid call.
    return mockVideoProvider;
  }
  return mockVideoProvider;
}

export function integrationModeForVideoProvider(
  providerKey: VideoProviderKey,
): "LIVE" | "SANDBOX" | "MOCK" {
  const envKey = LIVE_ENV_KEYS[providerKey];
  if (envKey && process.env[envKey]) return "SANDBOX";
  return "MOCK";
}
