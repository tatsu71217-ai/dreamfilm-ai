import { videoProviderFactory } from "@/services/video/VideoProviderFactory";

/**
 * アプリ全体で使用する VideoProviderFactory の単一インスタンス。
 * services/render/index.ts からのみ利用する想定。
 */
export { videoProviderFactory };

export type { VideoProviderId } from "@/services/video/types";
