import type {
  SocialProvider,
  SocialPublishRequest,
  SocialPublishResult,
} from "@/lib/providers/social/types";

/** Simulates a successful publish for any platform without calling a real API. */
export class MockSocialProvider implements SocialProvider {
  readonly platform: string;
  readonly mode = "MOCK" as const;

  constructor(platform: string) {
    this.platform = platform;
  }

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!request.caption.trim()) {
      return { success: false, errorMessage: "Caption darf nicht leer sein." };
    }
    return {
      success: true,
      externalPostUrl: `https://mock.${this.platform.toLowerCase()}.example/post/${request.postId}`,
    };
  }
}

export function resolveSocialProvider(platform: string): SocialProvider {
  return new MockSocialProvider(platform);
}
