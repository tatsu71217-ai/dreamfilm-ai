import { GoogleVeoProvider } from "@/services/video/GoogleVeoProvider";
import { MockVideoProvider } from "@/services/video/MockVideoProvider";
import { PollinationsVideoProvider } from "@/services/video/PollinationsVideoProvider";
import type { VideoProvider } from "@/services/video/VideoProvider";
import type { VideoProviderId } from "@/services/video/types";

export interface VideoProviderFactoryConfig {
  /** Google Veo選択時に使用するAPIキー */
  googleVeoApiKey?: string;
  /** Pollinations選択時に使用するAPIキー */
  pollinationsApiKey?: string;
  /** Pollinations選択時に使用する動画モデル */
  pollinationsModel?: string;
}

/**
 * Mock（ダミー）プロバイダーを利用できるかどうか。
 *
 * 実動画生成へ移行したため、本番ビルドではMockを提供しない。
 * ただし開発中はAPIキーや課金なしでRenderパイプライン全体を動かせる必要があるため、
 * 開発ビルドに限り利用可能なままにしている。
 * `import.meta.env.DEV` は静的に解決されるため、本番バンドルからは
 * MockVideoProvider ごとツリーシェイクされる。
 */
export const isMockProviderAvailable = import.meta.env.DEV;

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
      case "pollinations":
        return new PollinationsVideoProvider({
          apiKey: config.pollinationsApiKey ?? "",
          model: config.pollinationsModel,
        });
      case "veo":
        return new GoogleVeoProvider({ apiKey: config.googleVeoApiKey ?? "" });
      case "mock":
        if (!isMockProviderAvailable) {
          throw new Error(
            "Mockプロバイダーは開発用のため、この環境では利用できません。設定画面から動画生成プロバイダーを選び直してください。",
          );
        }
        return new MockVideoProvider();
      default:
        throw new Error(`未対応の動画生成プロバイダーです: ${providerId}`);
    }
  }
}

export const videoProviderFactory: VideoProviderFactory = new DefaultVideoProviderFactory();
