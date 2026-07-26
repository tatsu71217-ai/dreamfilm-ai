import { videoProviderFactory } from "@/services/video";
import { renderJobRepository } from "@/data/renderJobRepository";
import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import { createRenderService } from "@/services/render/RenderService";

/**
 * アプリ全体で使用する RenderService の単一インスタンス。
 * Sprint7より、固定のVideoProviderではなく `videoProviderFactory` と
 * `videoProviderSettingsRepository` を渡す構成に変更し、レンダリング開始のたびに
 * 現在のProvider設定（Mock / Google Veo）を反映できるようにしている。
 */
export const renderService = createRenderService(
  videoProviderFactory,
  renderJobRepository,
  videoProviderSettingsRepository,
);

export type { RenderService } from "@/services/render/RenderService";
