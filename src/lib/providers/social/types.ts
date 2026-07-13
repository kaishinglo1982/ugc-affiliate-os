export interface SocialPublishRequest {
  postId: string;
  platform: string;
  caption: string;
  hashtags: string[];
  mediaUrl?: string | null;
}

export interface SocialPublishResult {
  success: boolean;
  externalPostUrl?: string;
  errorMessage?: string;
}

/**
 * Every social platform adapter (TikTok, Instagram, Facebook, YouTube Shorts,
 * Pinterest, Reddit, X, LinkedIn, custom) implements this contract. Publishing
 * is never triggered automatically by an agent — it always requires an
 * explicit "Freigabe" (approval) step from the owner first (see Agents Center).
 */
export interface SocialProvider {
  readonly platform: string;
  readonly mode: "LIVE" | "SANDBOX" | "MOCK";
  publish(request: SocialPublishRequest): Promise<SocialPublishResult>;
}
