import { MockVideoProvider } from "@/services/video/MockVideoProvider";
import { GoogleVeoProvider } from "@/services/video/GoogleVeoProvider";
import type { VideoProvider } from "@/services/video/VideoProvider";
import type { VideoProviderId } from "@/services/video/types";

export interface VideoProviderFactoryConfig {
  /** Google Veo選択時にのみ使用する。それ以外のプロバイダーでは無視される */
  apiKey?: string;
}

/**
 * Provider名から対応する `VideoProvider` の実装を生成するFactory。
 *
 * WORK_ORDER (Sprint7) の「UIからProviderを直接生成しないこと」という要件に対応する。
 * UIやhooksは本Factoryを直接使わず、必ず services/render/RenderService.ts 経由で
 * 動画生成プロバイダーを利用する。
 */
export interface VideoProviderFactory {
  create(providerId: VideoProviderId, config: VideoProviderFactoryConfig): VideoProvider;
}

class DefaultVideoProviderFactory implements VideoProviderFactory {
  create(providerId: VideoProviderId, config: VideoProviderFactoryConfig): VideoProvider {
    switch (providerId) {
      case "mock":
        return new MockVideoProvider();
      case "veo":
        return new GoogleVeoProvider({ apiKey: config.apiKey ?? "" });
      default:
        // runway/kling/pika/luma は型レベルのプレースホルダーのみで未実装（制約により対象外）
        throw new Error(`未対応の動画生成プロバイダーです: ${providerId}`);
    }
  }
}

export const videoProviderFactory: VideoProviderFactory = new DefaultVideoProviderFactory();
